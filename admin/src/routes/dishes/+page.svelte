<script>
    import { onMount } from "svelte";
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";

    let dishes = [];
    let loading = true;
    let showModal = false;
    let editingDish = null;
    let filter = "all";
    let activeLang = "en";

    const languages = [
        { code: "en", label: "English" },
        { code: "ru", label: "Russian" },
        { code: "vi", label: "Vietnamese" },
        { code: "kk", label: "Kazakh" },
        { code: "uz", label: "Uzbek" },
        { code: "de", label: "German" },
        { code: "fr", label: "French" },
    ];

    let formData = {
        name_vi: "",
        description: {},
        warnings: {},
        allergens: {},
        spice_level: 1,
        price_range: "",
        search_tags: [],
        image_urls: [],
        is_moderated: false,
    };

    // Local state for comma-separated inputs
    let tagsInput = "";
    let imagesInput = "";
    let warningsInput = {}; // { en: '', ru: '', ... }
    let allergensInput = {}; // { en: '', ru: '', ... }

    onMount(async () => {
        await loadDishes();
        if ($page.url.searchParams.get("new") === "true") {
            openNewModal();
        }
    });

    async function loadDishes() {
        const res = await fetch("/api/dishes");
        dishes = await res.json();
        loading = false;
    }

    $: filteredDishes =
        filter === "all"
            ? dishes
            : filter === "moderated"
              ? dishes.filter((d) => d.is_moderated)
              : dishes.filter((d) => !d.is_moderated);

    function openNewModal() {
        editingDish = null;
        formData = {
            name_vi: "",
            description: {},
            warnings: {},
            allergens: {},
            spice_level: 1,
            price_range: "",
            search_tags: [],
            image_urls: [],
            is_moderated: false,
        };
        tagsInput = "";
        imagesInput = "";
        warningsInput = {};
        allergensInput = {};
        languages.forEach((l) => {
            formData.description[l.code] = "";
            warningsInput[l.code] = "";
            allergensInput[l.code] = "";
        });
        showModal = true;
    }

    function openEditModal(dish) {
        editingDish = dish;

        const desc =
            typeof dish.description === "string"
                ? JSON.parse(dish.description)
                : dish.description;
        const warn =
            typeof dish.warnings === "string"
                ? JSON.parse(dish.warnings)
                : dish.warnings;
        const aller =
            typeof dish.allergens === "string"
                ? JSON.parse(dish.allergens)
                : dish.allergens;

        formData = {
            name_vi: dish.name_vi,
            description: desc || {},
            warnings: warn || {},
            allergens: aller || {},
            spice_level: dish.spice_level || 1,
            price_range: dish.price_range || "",
            search_tags: Array.isArray(dish.search_tags)
                ? dish.search_tags
                : typeof dish.search_tags === "string"
                  ? dish.search_tags.split(",")
                  : [],
            image_urls: Array.isArray(dish.image_urls)
                ? dish.image_urls
                : typeof dish.image_urls === "string"
                  ? dish.image_urls.split(",")
                  : [],
            is_moderated: dish.is_moderated,
        };

        tagsInput = formData.search_tags.join(", ");
        imagesInput = formData.image_urls.join(", ");

        languages.forEach((l) => {
            const w = formData.warnings[l.code];
            warningsInput[l.code] = Array.isArray(w)
                ? w.join(", ")
                : typeof w === "string"
                  ? w
                  : "";
            const a = formData.allergens[l.code];
            allergensInput[l.code] = Array.isArray(a)
                ? a.join(", ")
                : typeof a === "string"
                  ? a
                  : "";
        });

        showModal = true;
    }

    async function saveDish() {
        // Process inputs
        formData.search_tags = tagsInput
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        formData.image_urls = imagesInput
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);

        languages.forEach((l) => {
            formData.warnings[l.code] = warningsInput[l.code]
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
            formData.allergens[l.code] = allergensInput[l.code]
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
        });

        const url = editingDish
            ? `/api/dishes?id=${editingDish.id}`
            : "/api/dishes";
        const method = editingDish ? "PUT" : "POST";

        await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
        });

        showModal = false;
        await loadDishes();
        goto("/dishes");
    }

    async function toggleModerated(dish) {
        await fetch(`/api/dishes?id=${dish.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_moderated: !dish.is_moderated }),
        });
        await loadDishes();
    }

    async function deleteDish(dish) {
        if (!confirm("Delete this dish?")) return;
        await fetch(`/api/dishes?id=${dish.id}`, { method: "DELETE" });
        await loadDishes();
    }
</script>

<div class="space-y-6">
    <div class="flex items-center justify-between">
        <div>
            <h1 class="text-3xl font-bold">Dishes</h1>
            <p class="text-zinc-400 mt-1">
                Manage Vietnamese dishes and metadata
            </p>
        </div>
        <button
            on:click={openNewModal}
            class="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
        >
            ➕ Add Dish
        </button>
    </div>

    <div class="flex gap-2">
        <button
            class="px-3 py-1.5 rounded-lg text-sm {filter === 'all'
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:text-white'}"
            on:click={() => (filter = "all")}>All ({dishes.length})</button
        >
        <button
            class="px-3 py-1.5 rounded-lg text-sm {filter === 'moderated'
                ? 'bg-green-600 text-white'
                : 'text-zinc-400 hover:text-white'}"
            on:click={() => (filter = "moderated")}
            >Moderated ({dishes.filter((d) => d.is_moderated).length})</button
        >
        <button
            class="px-3 py-1.5 rounded-lg text-sm {filter === 'pending'
                ? 'bg-yellow-600 text-white'
                : 'text-zinc-400 hover:text-white'}"
            on:click={() => (filter = "pending")}
            >Pending ({dishes.filter((d) => !d.is_moderated).length})</button
        >
    </div>

    {#if loading}
        <div class="flex items-center justify-center py-20">
            <div
                class="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"
            ></div>
        </div>
    {:else}
        <div class="grid gap-4">
            {#each filteredDishes as dish}
                {@const desc =
                    typeof dish.description === "string"
                        ? JSON.parse(dish.description)
                        : dish.description}
                <div
                    class="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-4"
                >
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-3">
                            <span class="text-2xl">🍜</span>
                            <div>
                                <div class="font-semibold text-lg">
                                    {dish.name_vi}
                                </div>
                                <div class="text-zinc-400 text-sm line-clamp-1">
                                    {desc?.en || desc?.ru || "No description"}
                                </div>
                                <div class="flex gap-2 mt-1">
                                    {#each Array.isArray(dish.search_tags) ? dish.search_tags : typeof dish.search_tags === "string" ? dish.search_tags.split(",") : [] as tag}
                                        <span
                                            class="px-1.5 py-0.5 bg-zinc-800 text-zinc-500 text-[10px] rounded uppercase font-bold"
                                            >{tag}</span
                                        >
                                    {/each}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="flex items-center gap-2">
                        <button
                            on:click={() => toggleModerated(dish)}
                            class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                {dish.is_moderated
                                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                : 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'}"
                        >
                            {dish.is_moderated ? "✓ Moderated" : "○ Pending"}
                        </button>
                        <button
                            on:click={() => openEditModal(dish)}
                            class="px-3 py-1.5 rounded-lg text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                        >
                            ✏️ Edit
                        </button>
                        <button
                            on:click={() => deleteDish(dish)}
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
    <div
        class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
        <div
            class="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col"
        >
            <div
                class="p-6 border-b border-zinc-800 flex justify-between items-center"
            >
                <h2 class="text-xl font-bold">
                    {editingDish ? "Edit Dish" : "New Dish"}
                </h2>
                <div class="flex bg-zinc-800 p-1 rounded-lg gap-1">
                    {#each languages as lang}
                        <button
                            class="px-3 py-1 rounded-md text-xs font-medium transition-all {activeLang ===
                            lang.code
                                ? 'bg-orange-500 text-white shadow-lg'
                                : 'text-zinc-400 hover:text-zinc-200'}"
                            on:click={() => (activeLang = lang.code)}
                        >
                            {lang.label}
                        </button>
                    {/each}
                </div>
            </div>

            <div class="p-6 space-y-6 overflow-y-auto">
                <div class="grid grid-cols-2 gap-6">
                    <div class="space-y-4">
                        <div>
                            <label
                                class="block text-xs font-bold text-zinc-500 uppercase mb-1.5"
                                >Vietnamese Name (Canonical)</label
                            >
                            <input
                                type="text"
                                bind:value={formData.name_vi}
                                class="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-orange-500 focus:outline-none"
                                placeholder="Phở Bò"
                            />
                        </div>

                        <div>
                            <label
                                class="block text-xs font-bold text-zinc-500 uppercase mb-1.5"
                                >Search Tags (comma separated)</label
                            >
                            <input
                                type="text"
                                bind:value={tagsInput}
                                class="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-orange-500 focus:outline-none"
                                placeholder="phở, bò, súp, nước"
                            />
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label
                                    class="block text-xs font-bold text-zinc-500 uppercase mb-1.5"
                                    >Spice Level (1-5)</label
                                >
                                <input
                                    type="number"
                                    min="1"
                                    max="5"
                                    bind:value={formData.spice_level}
                                    class="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-orange-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label
                                    class="block text-xs font-bold text-zinc-500 uppercase mb-1.5"
                                    >Price Range</label
                                >
                                <input
                                    type="text"
                                    bind:value={formData.price_range}
                                    class="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-orange-500 focus:outline-none"
                                    placeholder="50,000 - 80,000 VND"
                                />
                            </div>
                        </div>

                        <div>
                            <label
                                class="block text-xs font-bold text-zinc-500 uppercase mb-1.5"
                                >Image URLs (comma separated)</label
                            >
                            <textarea
                                bind:value={imagesInput}
                                rows="3"
                                class="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-orange-500 focus:outline-none text-sm"
                                placeholder="https://..."
                            ></textarea>
                        </div>
                    </div>

                    <div
                        class="space-y-4 bg-zinc-950/50 p-4 rounded-xl border border-zinc-800"
                    >
                        <div class="flex items-center gap-2 mb-2">
                            <span class="w-2 h-2 rounded-full bg-orange-500"
                            ></span>
                            <h3
                                class="text-sm font-bold text-zinc-300 uppercase tracking-wider"
                            >
                                Content: {languages.find(
                                    (l) => l.code === activeLang,
                                ).label}
                            </h3>
                        </div>

                        <div>
                            <label
                                class="block text-xs font-bold text-zinc-500 uppercase mb-1.5"
                                >Description</label
                            >
                            <textarea
                                bind:value={formData.description[activeLang]}
                                rows="5"
                                class="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-orange-500 focus:outline-none text-sm"
                                placeholder="Gourmet traveler style description..."
                            ></textarea>
                        </div>

                        <div>
                            <label
                                class="block text-xs font-bold text-zinc-500 uppercase mb-1.5"
                                >Warnings (comma separated)</label
                            >
                            <input
                                type="text"
                                bind:value={warningsInput[activeLang]}
                                class="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-orange-500 focus:outline-none text-sm"
                                placeholder="Very spicy, contains blood..."
                            />
                        </div>

                        <div>
                            <label
                                class="block text-xs font-bold text-zinc-500 uppercase mb-1.5"
                                >Allergens (comma separated)</label
                            >
                            <input
                                type="text"
                                bind:value={allergensInput[activeLang]}
                                class="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-orange-500 focus:outline-none text-sm"
                                placeholder="Peanuts, Shellfish..."
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div
                class="p-6 border-t border-zinc-800 flex justify-between items-center bg-zinc-900/50"
            >
                <div class="flex items-center gap-2">
                    <input
                        type="checkbox"
                        bind:checked={formData.is_moderated}
                        id="mod-check"
                        class="w-4 h-4 accent-orange-500"
                    />
                    <label for="mod-check" class="text-sm text-zinc-400"
                        >Mark as moderated</label
                    >
                </div>
                <div class="flex gap-3">
                    <button
                        on:click={() => (showModal = false)}
                        class="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        on:click={saveDish}
                        class="px-8 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold shadow-lg shadow-orange-500/20 transition-all hover:-translate-y-0.5"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
    :global(.line-clamp-1) {
        display: -webkit-box;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
</style>
