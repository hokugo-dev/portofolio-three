<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { injectAnalytics } from '@vercel/analytics/sveltekit';
	import { dev } from '$app/environment';

	let { children } = $props();

	onMount(() => {
		// Vercel Analytics
		injectAnalytics({ mode: dev ? 'development' : 'production' });
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
