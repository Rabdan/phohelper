<script>
  import '../app.css';
  import { page } from '$app/stores';
  
  const navItems = [
    { href: '/', label: 'Dashboard', icon: '📊' },
    { href: '/dishes', label: 'Dishes', icon: '🍜' },
    { href: '/phrases', label: 'Phrases', icon: '📝' },
    { href: '/users', label: 'Users', icon: '👥' },
  ];
</script>

<div class="min-h-screen bg-zinc-950 text-zinc-100">
  <nav class="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4">
      <div class="flex items-center justify-between h-16">
        <div class="flex items-center gap-8">
          <a href="/" class="text-xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
            PhoMenu Admin
          </a>
          <div class="flex gap-1">
            {#each navItems as item}
              <a 
                href={item.href}
                class="px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  {$page.url.pathname === item.href 
                    ? 'bg-zinc-800 text-white' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'}"
              >
                <span class="mr-2">{item.icon}</span>{item.label}
              </a>
            {/each}
          </div>
        </div>
      </div>
    </div>
  </nav>
  
  <main class="max-w-7xl mx-auto px-4 py-8">
    <slot />
  </main>
</div>