<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { PortfolioManager } from '$lib/PortfolioManager';

	let canvas: HTMLCanvasElement;
	let portfolioManager: PortfolioManager | null = null;
	let isLoading = $state(true);
	let showLoading = $state(true);
	let showScroll = $state(false);
	let isDarkMode = $state(false);
	let showWorkArea = $state(false);

	function initDarkMode() {
		isDarkMode = window?.matchMedia('(prefers-color-scheme: dark)')?.matches;
		// HTML要素にクラスを追加
		if (isDarkMode) {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}
	}

	// ダークモード切り替え関数
	function toggleDarkMode() {
		if (isDarkMode) {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}
		
		// Three.jsの背景色も更新
		if (portfolioManager) {
			portfolioManager.updateBackground(isDarkMode);
		}
	}

	async function initPortfolio() {
		if (!canvas) return;

		try {
			portfolioManager = new PortfolioManager(canvas);
			portfolioManager.onWheelChange = (wheel) => {
				showWorkArea = wheel > 3750 && wheel < 4500;
			};
			toggleDarkMode();
			
			await portfolioManager.generate(() => {
				// 描画完了後のコールバック
				setTimeout(() => {
					showLoading = false;
					isLoading = false;
					showScroll = true;
				}, 500); // 少し遅延させてスムーズに切り替え
			});
		} catch (error) {
			console.error('Portfolio initialization error:', error);
			showLoading = false;
			isLoading = false;
		}
	}

	function handleResize() {
		if (portfolioManager && canvas) {
			portfolioManager.resize();
		}
	}

	onMount(() => {
		initDarkMode();
		initPortfolio();
		
		let lastTouchY = 0;
		
		// リサイズイベントリスナー
		window.addEventListener('resize', handleResize);

		// PC用：ホイールイベント
		const handleWheelEvent = (e: WheelEvent) => {
			showScroll = false;
			portfolioManager?.handleWheel(e);
		};

		// スマホ用：タッチイベント
		const handleTouchStart = (e: TouchEvent) => {
			lastTouchY = e.touches[0].clientY;
		};

		const handleTouchMove = (e: TouchEvent) => {
			showScroll = false;
			const currentY = e.touches[0].clientY;
			const deltaY = lastTouchY - currentY;
			
			// WheelEventを模擬
			const wheelEvent = new WheelEvent('wheel', {
				deltaY: deltaY * 2,
				deltaMode: 0
			});
			portfolioManager?.handleWheel(wheelEvent);
			
			lastTouchY = currentY;
		};

		window.addEventListener('wheel', handleWheelEvent);
		window.addEventListener('touchstart', handleTouchStart, { passive: true });
		window.addEventListener('touchmove', handleTouchMove, { passive: true });
		
		return () => {
			window.removeEventListener('resize', handleResize);
			window.removeEventListener('wheel', handleWheelEvent);
			window.removeEventListener('touchstart', handleTouchStart);
			window.removeEventListener('touchmove', handleTouchMove);
			if (portfolioManager) {
				portfolioManager.dispose();
			}
		};
	});
</script>

<svelte:head>
	<title>portfolio - hokugo_wd</title>
	<meta name="description" content="hokugo_wdのポートフォリオページです。" />
</svelte:head>

<!--
===================================================
このサイトはhokugo_wdのポートフォリオサイトです
SvelteKit + Three.jsで作成しています
X: https://x.com/HokugoW
===================================================
-->

<div class="container min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
	<!-- スクロール指示 -->
	{#if showScroll}
		<div class="absolute bottom-0 w-full z-50">
			<div class="mx-auto text-center bg-white opacity-50 rounded-xl p-2 text-2xl font-bold">
				↓scroll↓
			</div>
		</div>
	{/if}
	<!-- light/dark -->
	{#if !showLoading}
		<div class="absolute top-4 right-4 z-50">
			<label for="theme-toggle" class="relative inline-flex items-center cursor-pointer">
				<input type="checkbox"
					id="theme-toggle"
					class="sr-only peer"
					bind:checked={isDarkMode}
					onchange={() => toggleDarkMode()}
				>
				<span class="pointer-events-none pr-1 w-8 h-8">
					<i class="icon-[tabler--sun] w-full h-full dark:text-gray-100"></i>
				</span>
				<div class="relative w-16 h-8 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-7 after:w-7 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
				<span class="pointer-events-none pl-1 w-8 h-8">
					<i class="icon-[tabler--moon] w-full h-full dark:text-gray-100"></i>
				</span>
			</label>
		</div>
	{/if}

	<!-- Three.js Canvas エリア（画面全体） -->
	<div class="relative w-screen h-screen overflow-hidden">
		<canvas 
			bind:this={canvas}
			class="w-full h-full"
			id="portfolio-canvas"
		></canvas>

		<!-- workエリア -->
		{#if showWorkArea}
			<div
				id="work-area"
				class="absolute top-0 bottom-0 right-0 left-1/2 flex items-start justify-center p-6 sm:p-10 pointer-events-none"
				transition:fade={{ duration: 250 }}
			>
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-5xl mt-8">
					<div class="bg-white/80 dark:bg-gray-900/80 backdrop-blur rounded-xl shadow-lg border border-gray-200/70 dark:border-gray-700/70 p-4 pointer-events-auto">
						<div class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
							Web Development
						</div>
						<div class="h-48 bg-gray-100 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400">
							<video src="/portfolio/works_01.mp4" loop autoplay muted class="w-full h-full object-cover"></video>
						</div>
					</div>
					<div class="bg-white/80 dark:bg-gray-900/80 backdrop-blur rounded-xl shadow-lg border border-gray-200/70 dark:border-gray-700/70 p-4 pointer-events-auto">
						<div class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
							3D Asset
						</div>
						<div class="h-48 bg-gray-100 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400">
							<img src="/portfolio/works_02.jpg" alt="3d asset" class="w-full h-full object-cover" />
						</div>
					</div>
				</div>
			</div>
		{/if}
		
		<!-- ローディング表示 -->
		{#if showLoading}
			<div 
				class="absolute inset-0 flex items-center justify-center bg-gray-800"
				transition:fade={{ duration: 400 }}
			>
				<div class="text-center">
					<p class="text-xl font-bold text-gray-100 p-2">Welcome!</p>
					<div class="animate-spin h-12 w-12 border-4 border-blue-600 rounded-full border-t-transparent mx-auto mb-4"></div>
					<p class="text-lg text-gray-100">loading...</p>
				</div>
			</div>
		{/if}
	</div>
</div>

<style lang="postcss">
	/* カスタムスタイル */
	.container {
		font-family: "YuMincho", "Yu Mincho", "游明朝", "Hiragino Mincho ProN", "Hiragino Mincho Pro", "HGS明朝E", "ＭＳ 明朝", "MS Mincho", serif;
	}
</style>
