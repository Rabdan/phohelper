<script>
  import { onMount } from 'svelte';
  
  let users = [];
  let loading = true;
  let search = '';
  
  onMount(async () => {
    const res = await fetch('/api/users');
    users = await res.json();
    loading = false;
  });
  
  $: filteredUsers = search 
    ? users.filter(u => 
        u.telegram_id?.includes(search) || 
        u.username?.toLowerCase().includes(search.toLowerCase()) ||
        u.first_name?.toLowerCase().includes(search.toLowerCase())
      )
    : users;
  
  function formatDate(date) {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-3xl font-bold">Users</h1>
      <p class="text-zinc-400 mt-1">Telegram bot users</p>
    </div>
  </div>
  
  <div class="relative">
    <input 
      type="text" 
      bind:value={search}
      placeholder="Search users..."
      class="w-full max-w-md px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg focus:border-green-500 focus:outline-none"
    />
    <span class="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">🔍</span>
  </div>
  
  {#if loading}
    <div class="flex items-center justify-center py-20">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
    </div>
  {:else if filteredUsers.length === 0}
    <div class="text-center py-20 text-zinc-500">
      <div class="text-4xl mb-4">👥</div>
      <p>No users found</p>
    </div>
  {:else}
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="text-left text-zinc-500 text-sm border-b border-zinc-800">
            <th class="pb-3 pl-4">ID</th>
            <th class="pb-3">Name</th>
            <th class="pb-3">Username</th>
            <th class="pb-3">First Seen</th>
            <th class="pb-3">Last Active</th>
          </tr>
        </thead>
        <tbody>
          {#each filteredUsers as user}
            <tr class="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors">
              <td class="py-4 pl-4 font-mono text-sm text-zinc-400">{user.telegram_id}</td>
              <td class="py-4">
                <div class="flex items-center gap-2">
                  <span class="text-xl">👤</span>
                  <span class="font-medium">{user.first_name || 'N/A'}</span>
                </div>
              </td>
              <td class="py-4 text-zinc-400">@{user.username || 'N/A'}</td>
              <td class="py-4 text-zinc-500 text-sm">{formatDate(user.created_at)}</td>
              <td class="py-4 text-zinc-500 text-sm">{formatDate(user.updated_at)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>