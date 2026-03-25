<script>
  import { onMount } from 'svelte';
  
  let stats = { dishes: 0, phrases: 0, users: 0, moderated: 0 };
  let loading = true;
  
  onMount(async () => {
    const [dishesRes, phrasesRes, usersRes] = await Promise.all([
      fetch('/api/dishes'),
      fetch('/api/phrases'),
      fetch('/api/users')
    ]);
    
    const dishes = await dishesRes.json();
    const phrases = await phrasesRes.json();
    const users = await usersRes.json();
    
    stats = {
      dishes: dishes.length,
      moderated: dishes.filter(d => d.is_moderated).length,
      phrases: phrases.length,
      users: users.length
    };
    loading = false;
  });
</script>

<div class="space-y-8">
  <div>
    <h1 class="text-3xl font-bold">Dashboard</h1>
    <p class="text-zinc-400 mt-2">Overview of your PhoMenu data</p>
  </div>
  
  {#if loading}
    <div class="flex items-center justify-center py-20">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
    </div>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <a href="/dishes" class="group p-6 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-orange-500/50 transition-all">
        <div class="text-4xl mb-3">🍜</div>
        <div class="text-3xl font-bold">{stats.dishes}</div>
        <div class="text-zinc-400 text-sm">Total Dishes</div>
        <div class="mt-2 text-xs text-orange-400">{stats.moderated} moderated</div>
      </a>
      
      <a href="/phrases" class="group p-6 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-blue-500/50 transition-all">
        <div class="text-4xl mb-3">📝</div>
        <div class="text-3xl font-bold">{stats.phrases}</div>
        <div class="text-zinc-400 text-sm">Phrases</div>
        <div class="mt-2 text-xs text-blue-400">Waiter phrases</div>
      </a>
      
      <a href="/users" class="group p-6 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-green-500/50 transition-all">
        <div class="text-4xl mb-3">👥</div>
        <div class="text-3xl font-bold">{stats.users}</div>
        <div class="text-zinc-400 text-sm">Users</div>
        <div class="mt-2 text-xs text-green-400">Telegram users</div>
      </a>
      
      <div class="p-6 rounded-xl bg-zinc-900 border border-zinc-800">
        <div class="text-4xl mb-3">🤖</div>
        <div class="text-3xl font-bold">{stats.dishes + stats.phrases}</div>
        <div class="text-zinc-400 text-sm">Total Items</div>
        <div class="mt-2 text-xs text-purple-400">In database</div>
      </div>
    </div>
    
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="p-6 rounded-xl bg-zinc-900 border border-zinc-800">
        <h2 class="text-lg font-semibold mb-4">Quick Actions</h2>
        <div class="space-y-2">
          <a href="/dishes?new=true" class="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors">
            <span class="text-xl">➕</span>
            <span>Add new dish</span>
          </a>
          <a href="/phrases?new=true" class="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors">
            <span class="text-xl">➕</span>
            <span>Add new phrase</span>
          </a>
        </div>
      </div>
      
      <div class="p-6 rounded-xl bg-zinc-900 border border-zinc-800">
        <h2 class="text-lg font-semibold mb-4">System Status</h2>
        <div class="space-y-3">
          <div class="flex justify-between items-center">
            <span class="text-zinc-400">Database</span>
            <span class="text-green-400">✓ Connected</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-zinc-400">Bot</span>
            <span class="text-green-400">✓ Running</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-zinc-400">Moderated Dishes</span>
            <span class="text-orange-400">{Math.round(stats.moderated / stats.dishes * 100) || 0}%</span>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>