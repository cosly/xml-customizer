<script lang="ts">
  import { onMount } from 'svelte';
  import { teamApi, type TeamData, type OrganizationMember, type PendingInvitation } from '$lib/api';
  import { auth } from '$lib/stores/auth';

  let teamData: TeamData | null = null;
  let loading = true;
  let error = '';

  // Invitation form
  let inviteEmail = '';
  let inviteRole: 'admin' | 'member' = 'member';
  let inviteLoading = false;
  let inviteError = '';
  let inviteSuccess = '';

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
      error = e instanceof Error ? e.message : 'Kon team data niet laden';
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
      await teamApi.sendInvitation(inviteEmail.trim(), inviteRole);
      inviteSuccess = `Uitnodiging verzonden naar ${inviteEmail}`;
      inviteEmail = '';
      inviteRole = 'member';
      await loadTeamData();
    } catch (e) {
      inviteError = e instanceof Error ? e.message : 'Uitnodiging verzenden mislukt';
    } finally {
      inviteLoading = false;
    }
  }

  async function cancelInvitation(invitation: PendingInvitation) {
    if (!confirm(`Weet je zeker dat je de uitnodiging naar ${invitation.email} wilt annuleren?`)) {
      return;
    }

    try {
      await teamApi.cancelInvitation(invitation.id);
      await loadTeamData();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Annuleren mislukt');
    }
  }

  async function resendInvitation(invitation: PendingInvitation) {
    try {
      await teamApi.resendInvitation(invitation.id);
      alert(`Uitnodiging opnieuw verzonden naar ${invitation.email}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Opnieuw verzenden mislukt');
    }
  }

  async function updateMemberRole(member: OrganizationMember, newRole: 'admin' | 'member') {
    try {
      await teamApi.updateMemberRole(member.id, newRole);
      await loadTeamData();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Rol wijzigen mislukt');
    }
  }

  async function removeMember(member: OrganizationMember) {
    if (!confirm(`Weet je zeker dat je ${member.name} uit het team wilt verwijderen?`)) {
      return;
    }

    try {
      await teamApi.removeMember(member.id);
      await loadTeamData();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Verwijderen mislukt');
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
      alert(e instanceof Error ? e.message : 'Naam wijzigen mislukt');
    } finally {
      nameLoading = false;
    }
  }

  function getRoleLabel(role: string): string {
    switch (role) {
      case 'owner': return 'Eigenaar';
      case 'admin': return 'Beheerder';
      case 'member': return 'Lid';
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
  <title>Team - XML Customizer</title>
</svelte:head>

<div class="page-header">
  <h1>Team</h1>
</div>

{#if loading}
  <div class="loading">Laden...</div>
{:else if error}
  <div class="alert alert-error">{error}</div>
{:else if teamData}
  <!-- Organization Info -->
  <div class="card">
    <div class="card-header">
      <h2>Organisatie</h2>
    </div>
    <div class="card-body">
      {#if editingName}
        <div class="form-group">
          <label for="orgName">Organisatienaam</label>
          <div class="input-group">
            <input
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
              Opslaan
            </button>
            <button
              class="btn btn-secondary"
              on:click={() => { editingName = false; newOrgName = teamData?.organization.name || ''; }}
              disabled={nameLoading}
            >
              Annuleren
            </button>
          </div>
        </div>
      {:else}
        <div class="org-info">
          <span class="org-name">{teamData.organization.name}</span>
          {#if canManageTeam()}
            <button class="btn btn-secondary btn-sm" on:click={() => editingName = true}>
              Wijzigen
            </button>
          {/if}
        </div>
        <p class="text-muted">Je rol: {getRoleLabel(teamData.role)}</p>
      {/if}
    </div>
  </div>

  <!-- Team Members -->
  <div class="card">
    <div class="card-header">
      <h2>Teamleden ({teamData.members.length})</h2>
    </div>
    <div class="card-body">
      <div class="members-list">
        {#each teamData.members as member}
          <div class="member-item">
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
                  on:change={(e) => updateMemberRole(member, e.currentTarget.value as 'admin' | 'member')}
                >
                  <option value="admin">Beheerder</option>
                  <option value="member">Lid</option>
                </select>
                <button class="btn btn-danger btn-sm" on:click={() => removeMember(member)}>
                  Verwijderen
                </button>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>

  <!-- Invite New Member -->
  {#if canManageTeam()}
    <div class="card">
      <div class="card-header">
        <h2>Teamlid uitnodigen</h2>
      </div>
      <div class="card-body">
        {#if inviteSuccess}
          <div class="alert alert-success">{inviteSuccess}</div>
        {/if}
        {#if inviteError}
          <div class="alert alert-error">{inviteError}</div>
        {/if}
        <form on:submit|preventDefault={sendInvitation} class="invite-form">
          <div class="form-group">
            <label for="inviteEmail">Email adres</label>
            <input
              type="email"
              id="inviteEmail"
              bind:value={inviteEmail}
              placeholder="email@voorbeeld.nl"
              disabled={inviteLoading}
            />
          </div>
          <div class="form-group">
            <label for="inviteRole">Rol</label>
            <select id="inviteRole" bind:value={inviteRole} disabled={inviteLoading}>
              <option value="member">Lid - kan feeds en klanten beheren</option>
              <option value="admin">Beheerder - kan ook teamleden uitnodigen</option>
            </select>
          </div>
          <button type="submit" class="btn btn-primary" disabled={inviteLoading || !inviteEmail.trim()}>
            {inviteLoading ? 'Verzenden...' : 'Uitnodiging versturen'}
          </button>
        </form>
      </div>
    </div>

    <!-- Pending Invitations -->
    {#if teamData.pendingInvitations.length > 0}
      <div class="card">
        <div class="card-header">
          <h2>Openstaande uitnodigingen ({teamData.pendingInvitations.length})</h2>
        </div>
        <div class="card-body">
          <div class="invitations-list">
            {#each teamData.pendingInvitations as invitation}
              <div class="invitation-item">
                <div class="invitation-info">
                  <span class="invitation-email">{invitation.email}</span>
                  <span class="invitation-details">
                    Rol: {getRoleLabel(invitation.role)} |
                    Uitgenodigd door: {invitation.invited_by_name} |
                    Verloopt: {new Date(invitation.expires_at).toLocaleDateString('nl-NL')}
                  </span>
                </div>
                <div class="invitation-actions">
                  <button class="btn btn-secondary btn-sm" on:click={() => resendInvitation(invitation)}>
                    Opnieuw versturen
                  </button>
                  <button class="btn btn-danger btn-sm" on:click={() => cancelInvitation(invitation)}>
                    Annuleren
                  </button>
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    {/if}
  {/if}
{/if}

<style>
  .org-info {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.5rem;
  }

  .org-name {
    font-size: 1.25rem;
    font-weight: 600;
  }

  .input-group {
    display: flex;
    gap: 0.5rem;
  }

  .input-group input {
    flex: 1;
  }

  .members-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .member-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: var(--bg-tertiary);
    border-radius: 6px;
  }

  .member-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .member-name {
    font-weight: 500;
  }

  .member-email {
    font-size: 0.875rem;
    color: var(--text-muted);
  }

  .member-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .role-badge {
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .role-owner {
    background: #fef3c7;
    color: #92400e;
  }

  .role-admin {
    background: #dbeafe;
    color: #1e40af;
  }

  .role-member {
    background: #e0e7ff;
    color: #3730a3;
  }

  .role-select {
    padding: 0.25rem 0.5rem;
    font-size: 0.875rem;
    border-radius: 4px;
    border: 1px solid var(--border-color);
  }

  .invite-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-width: 400px;
  }

  .invitations-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .invitation-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: var(--bg-tertiary);
    border-radius: 6px;
  }

  .invitation-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .invitation-email {
    font-weight: 500;
  }

  .invitation-details {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .invitation-actions {
    display: flex;
    gap: 0.5rem;
  }

  .alert-success {
    background: #d1fae5;
    color: #065f46;
    padding: 0.75rem;
    border-radius: 6px;
    margin-bottom: 1rem;
  }
</style>
