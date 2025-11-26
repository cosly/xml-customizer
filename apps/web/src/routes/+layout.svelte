<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
</script>

<nav class="nav">
  <div class="container nav-content">
    <a href="/" class="nav-brand">XML Customizer</a>
    <div class="nav-links">
      <a href="/feeds" class="nav-link" class:active={$page.url.pathname.startsWith('/feeds')}>
        Feeds
      </a>
      <a href="/customers" class="nav-link" class:active={$page.url.pathname.startsWith('/customers')}>
        Klanten
      </a>
    </div>
  </div>
</nav>

<main class="container">
  <slot />
</main>

<style>
  main {
    padding-bottom: 2rem;
  }
</style>
