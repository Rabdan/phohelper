<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  
  let phrases = [];
  let loading = true;
  let showModal = false;
  let editingPhrase = null;
  let filter = 'all';
  
  let formData = {
    phrase_vi: '',
    category: 'food',
    translations: { en: '', ru: '', de: '', fr: '' }
  };
  
  const categories = ['food', 'drink', 'greeting', 'payment', 'other'];
  
  onMount(async () => {
    await loadPhrases();
    if ($page.url.searchParams.get('new') === 'true') {
      openNewModal();
    }
  });
  
  async function loadPhrases() {
    const res = await fetch('/api/phrases');
    phrases = await res.json();
    loading = false;
  }
  
  $: filteredPhrases = filter === 'all' 
    ? phrases 
    : phrases.filter(p => p.category === filter);
  
  function openNewModal() {
    editingPhrase = null;
    formData = { phrase_vi: '', category: 'food', translations: { en: '', ru: '', de: '', fr: '' } };
    showModal = true;
  }
  
  function openEditModal(phrase) {
    editingPhrase = phrase;
    const trans = typeof phrase.translations === 'string' ? JSON.parse(phrase.translations) : phrase.translations;
    formData = {
      phrase_vi: phrase.phrase_vi,
      category: phrase.category,
      translations: trans || {}
    };
    showModal = true;
  }
  
  async function savePhrase() {
    const url = editingPhrase ? `/api/phrases?id=${editingPhrase.id}` : '/api/phrases';
    const method = editingPhrase ? 'PUT' : 'POST';
    
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    showModal = false;
    await loadPhrases();
    goto('/phrases');
  }
  
  async function deletePhrase(phrase) {
    if (!confirm('Delete this phrase?')) return;
    await fetch(`/api/phrases?id=${phrase.id}`, { method: 'DELETE' });
    await loadPhrases();
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-3xl font-bold">Phrases</h1>
      <p class="text-zinc-400 mt-1">Waiter phrases for ordering</p>
    </div>
    <button 
      on:click={openNewModal}
      class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
    >
      ➕ Add Phrase
    </button>
  </div>
  
  <div class="flex gap-2 flex-wrap">
    <button 
      class="px-3 py-1.5 rounded-lg text-sm {filter === 'all' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}"
      on:click={() => filter = 'all'}
    >All ({phrases.length})</button>
    {#each categories as cat}
      <button 
        class="px-3 py-1.5 rounded-lg text-sm {filter === cat ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'}"
        on:click={() => filter = cat}
      >{cat} ({phrases.filter(p => p.category === cat).length})</button>
    {/each}
  </div>
  
  {#if loading}
    <div class="flex items-center justify-center py-20">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>
  {:else}
    <div class="grid gap-3">
      {#each filteredPhrases as phrase}
        {@const trans = typeof phrase.translations === 'string' ? JSON.parse(phrase.translations) : phrase.translations}
        <div class="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-3">
              <span class="text-xl">🗣️</span>
              <div>
                <div class="font-semibold">{phrase.phrase_vi}</div>
                <div class="text-zinc-400 text-sm">
                  {trans?.en || 'No English'} • {trans?.ru || 'No Russian'}
                </div>
              </div>
            </div>
          </div>
          
          <div class="flex items-center gap-2">
            <span class="px-2 py-1 rounded text-xs bg-zinc-800 text-zinc-400">{phrase.category}</span>
            <button 
              on:click={() => openEditModal(phrase)}
              class="px-3 py-1.5 rounded-lg text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
            >
              ✏️ Edit
            </button>
            <button 
              on:click={() => deletePhrase(phrase)}
              class="px-3 py-1.5 rounded-lg text-sm bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
            >
              🗑️
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

{#if showModal}
  <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div class="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg">
      <div class="p-6 border-b border-zinc-800">
        <h2 class="text-xl font-bold">{editingPhrase ? 'Edit Phrase' : 'New Phrase'}</h2>
      </div>
      
      <div class="p-6 space-y-4">
        <div>
          <label class="block text-sm font-medium text-zinc-400 mb-2">Vietnamese Phrase</label>
          <input 
            type="text" 
            bind:value={formData.phrase_vi}
            class="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-blue-500 focus:outline-none"
            placeholder="Không đường"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-zinc-400 mb-2">Category</label>
          <select 
            bind:value={formData.category}
            class="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-blue-500 focus:outline-none"
          >
            {#each categories as cat}
              <option value={cat}>{cat}</option>
            {/each}
          </select>
        </div>
        
        <div class="space-y-3">
          <h3 class="font-medium text-zinc-300">Translations</h3>
          <div class="grid grid-cols-2 gap-3">
            <input 
              type="text" 
              bind:value={formData.translations.en}
              class="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
              placeholder="English"
            />
            <input 
              type="text" 
              bind:value={formData.translations.ru}
              class="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
              placeholder="Russian"
            />
            <input 
              type="text" 
              bind:value={formData.translations.de}
              class="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
              placeholder="German"
            />
            <input 
              type="text" 
              bind:value={formData.translations.fr}
              class="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
              placeholder="French"
            />
          </div>
        </div>
      </div>
      
      <div class="p-6 border-t border-zinc-800 flex justify-end gap-3">
        <button 
          on:click={() => showModal = false}
          class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button 
          on:click={savePhrase}
          class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
        >
          Save
        </button>
      </div>
    </div>
  </div>
{/if}