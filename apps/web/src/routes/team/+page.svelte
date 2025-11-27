<script lang="ts">
  import { onMount } from 'svelte';
  import { _ } from 'svelte-i18n';
  import { teamApi, type TeamData, type OrganizationMember, type PendingInvitation, type Salutation } from '$lib/api';
  import { auth } from '$lib/stores/auth';

  let teamData: TeamData | null = null;
  let loading = true;
  let error = '';

  // Invitation form
  let inviteEmail = '';
  let inviteRole: 'admin' | 'member' = 'member';
  let inviteSalutation: Salutation = null;
  let inviteFirstName = '';
  let inviteLastName = '';
  let inviteLoading = false;
  let inviteError = '';
  let inviteSuccess = '';

  const salutationOptions: { value: Salutation; labelKey: string }[] = [
    { value: null, labelKey: 'profile.salutation.none' },
    { value: 'mr', labelKey: 'profile.salutation.mr' },
    { value: 'ms', labelKey: 'profile.salutation.ms' },
    { value: 'mrs', labelKey: 'profile.salutation.mrs' },
    { value: 'mx', labelKey: 'profile.salutation.mx' },
    { value: 'dr', labelKey: 'profile.salutation.dr' },
    { value: 'prof', labelKey: 'profile.salutation.prof' },
    { value: 'other', labelKey: 'profile.salutation.other' },
  ];

  // Organization name editing
  let editingName = false;
  let newOrgName = '';
  let nameLoading = false;

  onMount(async () => {
    await loadTeamData();
  });

  async function loadTeamData() {
    loading = true;
    error = '';
    try {
      teamData = await teamApi.get();
      newOrgName = teamData.organization.name;
    } catch (e) {
      error = e instanceof Error ? e.message : $_('team.loadError');
    } finally {
      loading = false;
    }
  }

  async function sendInvitation() {
    if (!inviteEmail.trim()) return;

    inviteLoading = true;
    inviteError = '';
    inviteSuccess = '';

    try {
      await teamApi.sendInvitation(inviteEmail.trim(), inviteRole, {
        salutation: inviteSalutation,
        first_name: inviteFirstName.trim() || undefined,
        last_name: inviteLastName.trim() || undefined,
      });
      inviteSuccess = $_('team.invitationSent', { values: { email: inviteEmail } });
      inviteEmail = '';
      inviteRole = 'member';
      inviteSalutation = null;
      inviteFirstName = '';
      inviteLastName = '';
      await loadTeamData();
    } catch (e) {
      inviteError = e instanceof Error ? e.message : $_('team.inviteError');
    } finally {
      inviteLoading = false;
    }
  }

  async function cancelInvitation(invitation: PendingInvitation) {
    if (!confirm($_('team.confirmCancel', { values: { email: invitation.email } }))) {
      return;
    }

    try {
      await teamApi.cancelInvitation(invitation.id);
      await loadTeamData();
    } catch (e) {
      alert(e instanceof Error ? e.message : $_('team.cancelError'));
    }
  }

  async function resendInvitation(invitation: PendingInvitation) {
    try {
      await teamApi.resendInvitation(invitation.id);
      alert($_('team.invitationSent', { values: { email: invitation.email } }));
    } catch (e) {
      alert(e instanceof Error ? e.message : $_('team.resendError'));
    }
  }

  async function updateMemberRole(member: OrganizationMember, newRole: string) {
    try {
      await teamApi.updateMemberRole(member.id, newRole as 'admin' | 'member');
      await loadTeamData();
    } catch (e) {
      alert(e instanceof Error ? e.message : $_('team.roleChangeError'));
    }
  }

  async function removeMember(member: OrganizationMember) {
    if (!confirm($_('team.confirmRemove', { values: { name: member.name } }))) {
      return;
    }

    try {
      await teamApi.removeMember(member.id);
      await loadTeamData();
    } catch (e) {
      alert(e instanceof Error ? e.message : $_('team.removeError'));
    }
  }

  async function updateOrganizationName() {
    if (!newOrgName.trim()) return;

    nameLoading = true;
    try {
      await teamApi.updateOrganization(newOrgName.trim());
      await loadTeamData();
      editingName = false;
    } catch (e) {
      alert(e instanceof Error ? e.message : $_('team.nameChangeError'));
    } finally {
      nameLoading = false;
    }
  }

  function getRoleLabel(role: string): string {
    switch (role) {
      case 'owner': return $_('team.owner');
      case 'admin': return $_('team.admin');
      case 'member': return $_('team.member');
      default: return role;
    }
  }

  function canManageTeam(): boolean {
    return teamData?.role === 'owner' || teamData?.role === 'admin';
  }

  function isOwner(): boolean {
    return teamData?.role === 'owner';
  }
</script>

<svelte:head>
  <title>{$_('team.title')} - Tesoro CRM</title>
</svelte:head>

<div class="page-header">
  <h1 class="page-title">{$_('team.title')}</h1>
</div>

{#if loading}
  <div class="empty-state">
    <div class="spinner"></div>
    <p>{$_('common.loading')}</p>
  </div>
{:else if error}
  <div class="alert alert-error">{error}</div>
{:else if teamData}
  <!-- Organization Info -->
  <section class="section">
    <div class="card">
      <div class="card-header">
        <h2>{$_('team.organization')}</h2>
      </div>
      <div class="card-content">
        {#if editingName}
          <div class="form-group">
            <label class="label" for="orgName">{$_('team.organizationName')}</label>
            <div class="input-row">
              <input
                class="input"
                type="text"
                id="orgName"
                bind:value={newOrgName}
                disabled={nameLoading}
              />
              <button
                class="btn btn-primary"
                on:click={updateOrganizationName}
                disabled={nameLoading || !newOrgName.trim()}
              >
                {$_('common.save')}
              </button>
              <button
                class="btn btn-secondary"
                on:click={() => { editingName = false; newOrgName = teamData?.organization.name || ''; }}
                disabled={nameLoading}
              >
                {$_('common.cancel')}
              </button>
            </div>
          </div>
        {:else}
          <div class="org-display">
            <div class="org-info">
              <span class="org-name">{teamData.organization.name}</span>
              <span class="org-role">
                {$_('team.yourRole')}: <strong>{getRoleLabel(teamData.role)}</strong>
              </span>
            </div>
            {#if canManageTeam()}
              <button class="btn btn-secondary btn-sm" on:click={() => editingName = true}>
                {$_('common.edit')}
              </button>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </section>

  <!-- Team Members -->
  <section class="section">
    <div class="card">
      <div class="card-header">
        <h2>{$_('team.members')} ({teamData.members.length})</h2>
      </div>
      <div class="card-content">
        <div class="members-list">
          {#each teamData.members as member}
            <div class="member-row">
              <div class="member-info">
                <span class="member-name">{member.name}</span>
                <span class="member-email">{member.email}</span>
              </div>
              <div class="member-actions">
                <span class="role-badge role-{member.role}">{getRoleLabel(member.role)}</span>
                {#if isOwner() && member.id !== $auth.user?.id && member.role !== 'owner'}
                  <select
                    class="role-select"
                    value={member.role}
                    on:change={(e) => updateMemberRole(member, e.currentTarget.value)}
                  >
                    <option value="admin">{$_('team.admin')}</option>
                    <option value="member">{$_('team.member')}</option>
                  </select>
                  <button class="btn btn-danger btn-sm" on:click={() => removeMember(member)}>
                    {$_('team.remove')}
                  </button>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </section>

  <!-- Invite New Member -->
  {#if canManageTeam()}
    <section class="section">
      <div class="card">
        <div class="card-header">
          <h2>{$_('team.inviteMember')}</h2>
        </div>
        <div class="card-content">
          {#if inviteSuccess}
            <div class="alert alert-success">{inviteSuccess}</div>
          {/if}
          {#if inviteError}
            <div class="alert alert-error">{inviteError}</div>
          {/if}
          <form on:submit|preventDefault={sendInvitation} class="invite-form">
            <div class="form-group">
              <label class="label" for="inviteEmail">{$_('team.email')} *</label>
              <input
                class="input"
                type="email"
                id="inviteEmail"
                bind:value={inviteEmail}
                placeholder={$_('auth.emailPlaceholder')}
                disabled={inviteLoading}
              />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="label" for="inviteSalutation">{$_('profile.salutation.label')}</label>
                <select class="input" id="inviteSalutation" bind:value={inviteSalutation} disabled={inviteLoading}>
                  {#each salutationOptions as option}
                    <option value={option.value}>{$_(option.labelKey)}</option>
                  {/each}
                </select>
              </div>
              <div class="form-group">
                <label class="label" for="inviteFirstName">{$_('profile.firstName')}</label>
                <input
                  class="input"
                  type="text"
                  id="inviteFirstName"
                  bind:value={inviteFirstName}
                  placeholder={$_('profile.firstNamePlaceholder')}
                  disabled={inviteLoading}
                />
              </div>
              <div class="form-group">
                <label class="label" for="inviteLastName">{$_('profile.lastName')}</label>
                <input
                  class="input"
                  type="text"
                  id="inviteLastName"
                  bind:value={inviteLastName}
                  placeholder={$_('profile.lastNamePlaceholder')}
                  disabled={inviteLoading}
                />
              </div>
            </div>
            <div class="form-group">
              <label class="label" for="inviteRole">{$_('team.role')}</label>
              <select class="input" id="inviteRole" bind:value={inviteRole} disabled={inviteLoading}>
                <option value="member">{$_('team.memberRole')}</option>
                <option value="admin">{$_('team.adminRole')}</option>
              </select>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary" disabled={inviteLoading || !inviteEmail.trim()}>
                {#if inviteLoading}
                  <span class="spinner"></span>
                  {$_('team.sending')}
                {:else}
                  {$_('team.invite')}
                {/if}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>

    <!-- Pending Invitations -->
    {#if teamData.pendingInvitations.length > 0}
      <section class="section">
        <div class="card">
          <div class="card-header">
            <h2>{$_('team.pendingInvitations')} ({teamData.pendingInvitations.length})</h2>
          </div>
          <div class="card-content">
            <div class="invitations-list">
              {#each teamData.pendingInvitations as invitation}
                <div class="invitation-row">
                  <div class="invitation-info">
                    <span class="invitation-email">{invitation.email}</span>
                    <span class="invitation-meta">
                      <span class="role-badge role-{invitation.role}">{getRoleLabel(invitation.role)}</span>
                      <span class="meta-separator">|</span>
                      <span>{$_('team.invitedBy')}: {invitation.invited_by_name}</span>
                      <span class="meta-separator">|</span>
                      <span>{$_('team.expiresOn')}: {new Date(invitation.expires_at).toLocaleDateString()}</span>
                    </span>
                  </div>
                  <div class="invitation-actions">
                    <button class="btn btn-secondary btn-sm" on:click={() => resendInvitation(invitation)}>
                      {$_('team.resend')}
                    </button>
                    <button class="btn btn-danger btn-sm" on:click={() => cancelInvitation(invitation)}>
                      {$_('team.cancelInvitation')}
                    </button>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </div>
      </section>
    {/if}
  {/if}
{/if}

<style>
  .section {
    margin-bottom: 1.5rem;
  }

  .card-header {
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--border);
  }

  .card-header h2 {
    font-size: 1.125rem;
    font-weight: 600;
    margin: 0;
  }

  .card-content {
    padding: 1.5rem;
  }

  .org-display {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .org-info {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .org-name {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text);
  }

  .org-role {
    font-size: 0.875rem;
    color: var(--text-muted);
  }

  .input-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .input-row .input {
    flex: 1;
    max-width: 400px;
  }

  .members-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .member-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: var(--bg);
    border-radius: var(--radius);
    transition: background 0.15s ease;
  }

  .member-row:hover {
    background: var(--border);
  }

  .member-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .member-name {
    font-weight: 500;
    color: var(--text);
  }

  .member-email {
    font-size: 0.875rem;
    color: var(--text-muted);
  }

  .member-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .role-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .role-owner {
    background: rgba(245, 158, 11, 0.15);
    color: #b45309;
  }

  .role-admin {
    background: rgba(37, 99, 235, 0.15);
    color: #1d4ed8;
  }

  .role-member {
    background: rgba(100, 116, 139, 0.15);
    color: #475569;
  }

  .role-select {
    padding: 0.375rem 0.75rem;
    font-size: 0.875rem;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    background: var(--bg-card);
    cursor: pointer;
    min-width: 140px;
  }

  .role-select:focus {
    outline: none;
    border-color: var(--primary);
  }

  .invite-form {
    max-width: 700px;
  }

  .invite-form .form-group {
    margin-bottom: 1rem;
  }

  .invite-form .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .invite-form .form-row .form-group {
    margin-bottom: 0;
  }

  .invite-form .input {
    width: 100%;
  }

  .invite-form select.input {
    cursor: pointer;
  }

  @media (max-width: 600px) {
    .invite-form .form-row {
      grid-template-columns: 1fr;
    }
  }

  .form-actions {
    margin-top: 1.5rem;
  }

  .invitations-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .invitation-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: var(--bg);
    border-radius: var(--radius);
  }

  .invitation-info {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .invitation-email {
    font-weight: 500;
    color: var(--text);
  }

  .invitation-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .meta-separator {
    color: var(--border);
  }

  .invitation-actions {
    display: flex;
    gap: 0.5rem;
  }

  @media (max-width: 768px) {
    .member-row,
    .invitation-row {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }

    .member-actions,
    .invitation-actions {
      width: 100%;
      justify-content: flex-start;
    }

    .org-display {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }

    .invitation-meta {
      flex-wrap: wrap;
    }
  }
</style>
