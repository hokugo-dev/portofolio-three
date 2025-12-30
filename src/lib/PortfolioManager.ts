import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { portfolioText, boardList, logoList } from './portfolioData.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';

export class PortfolioManager {
  canvas: HTMLCanvasElement;
  renderer: THREE.WebGLRenderer | null = null;
  scene: THREE.Scene | null = null;
  camera: THREE.PerspectiveCamera | null = null;
  animation: THREE.AnimationClip[] | null = [];
  mixer: THREE.AnimationMixer[] | null = [];
  clock = new THREE.Clock();
  animationId: number | null = null;
  isLoading: boolean = true;
  run: boolean = false;
  gltfModel: THREE.Group | null = null;
  wheel: number = 0;
  portfolioText: string[][] = [];
  boardList: string[][] = [];
  onWheelChange?: (wheel: number) => void;
  spriteObj: THREE.Sprite[] | null = [];
  isDarkMode: boolean = false;
  stats: Stats | null = null;
  showDebug: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.portfolioText = portfolioText;
    this.boardList = boardList;
    this.stats = new Stats();
    this.showDebug = false;
  }

  async generate(onComplete?: () => void) {
    try {
      this.isLoading = true;

      if (this.stats && this.showDebug) {
        window.document.body.appendChild(this.stats.dom);
      }
      
      // 既存のレンダラーをクリーンアップ
      if (this.renderer) {
        this.renderer.dispose();
      }

      // Canvasサイズ設定（画面全体）
      const width = window.innerWidth;
      const height = this.isMobile() ? width * (16/9) : width * (9/16); // スマホ:9:16, PC:16:9
      
      this.canvas.width = width;
      this.canvas.height = height;
      this.canvas.style.background = this.isDarkMode 
        ? 'linear-gradient(to bottom, #0a0e27, #2d3748)'  // 夜空: 濃い夜空→少し明るめ
        : 'linear-gradient(to bottom, #a1d2e6, #F0F8FF)';  // 青空: 柔らかい青→淡い青（抑えめ）

      // レンダラー初期化
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        alpha: true,
      });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      // シーン初期化
      this.scene = new THREE.Scene();
      this.scene.background = null; // CSS背景グラデーションを使用

      // GLBファイル読み込み（カメラとライトも含む）
      await this.loadGLBModel();

      // fog設定
      this.scene.fog = new THREE.Fog(!this.isDarkMode ? 0xcfd8dc : 0x0a0e27, 5, 12);

      // アニメーションループ開始
      this.startAnimation();

      this.isLoading = false;
      
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('PortfolioManager generate error:', error);
      this.isLoading = false;
      throw error;
    }
  }


  private async loadGLBModel() {
    if (!this.scene) return;

    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.4.1/');
    loader.setDRACOLoader(dracoLoader);

    try {
      const gltf = await loader.loadAsync('/portfolio/koguchi_asset_portfolio.glb');
      
      if (gltf.scene) {
        this.gltfModel = gltf.scene;
        this.animation = gltf.animations;
        
        // GLBファイルからカメラを取得
        if (gltf.cameras && gltf.cameras.length > 0) {
          this.camera = gltf.cameras[1] as THREE.PerspectiveCamera;
          this.camera!.fov = 35;
          if (this.isMobile()) {
            // スマホ用のアスペクト比調整
            if (this.camera instanceof THREE.PerspectiveCamera) {
              this.camera.aspect = 9 / 16;
              this.camera.fov = 40;
            }
          }
          this.camera!.updateProjectionMatrix();
        }

        // 環境光追加
        this.scene.add(new THREE.AmbientLight(0xaaccff, !this.isDarkMode ? 0.5 : 0.05));
        
        // ライト調整
        this.adjustLightIntensity();
        this.gltfModel.children.forEach((child) => {
          // 影の設定
          if (child.name === 'base') {
            child.receiveShadow = true;
            child.children.forEach(child => {
              if (child instanceof THREE.Mesh) {
                child.receiveShadow = true;
              }
            });
          }
          if (child.name.includes('board') || child.name.includes('monument')) {
            child.children.forEach(child => {
              if (child instanceof THREE.Mesh) {
                child.castShadow = true;
              }
            });
          }
          if (child.name.includes('wall')) {
            child.children.forEach(child => {
              if (child instanceof THREE.Mesh) {
                child.receiveShadow = true;
                child.castShadow = true;
              }
            });
          }
          if (child.name.includes('hori')) {
            child.children.forEach(child => {
              if (child instanceof THREE.Mesh) {
                child.receiveShadow = true;
                child.castShadow = false;
              }
            });
          }
        });

        this.scene.add(this.gltfModel);

        // テキスト作成
        for (let idx = 0; idx < this.portfolioText.length; idx++) {
          const text = this.portfolioText[idx];
          const boardItem = this.boardList[idx];
          const board = this.gltfModel!.children.find(child => child.name === boardItem[0]);
          const sprite: THREE.Sprite | undefined = await this.createSprite(text, idx);
          if (!sprite) {
            continue;
          }
          const position: [number, number, number] = [board?.position.x || 0, (board?.position.y || 0) - 0.1, board?.position.z || 0];
          if (boardItem[1].includes('x')) {
            position[0] -= 0.1;
          }
          if (boardItem[1].includes('z')) {
            position[2] += 0.05;
          }
          if (boardItem[1].includes('-x')) {
            position[0] += 0.2;
          }

          sprite.position.set(...position);
          sprite.scale.set(Number(boardItem[2]), Number(boardItem[2]), Number(boardItem[2]));
          this.scene!.add(sprite);
          if (idx !== 1) {
            sprite.visible = false;
            this.spriteObj.push(sprite);
          }
        }
      }
    } catch (error) {
      console.error('GLB model loading error:', error);
      throw error;
    } finally {
      this.animation?.forEach(animation => {
        if (this.animation) {
          const mixer = new THREE.AnimationMixer(this.scene!)
          this.mixer?.push(mixer);
          const action = mixer.clipAction(animation);
          action.play();
        }
      });
    }
  }

  handleWheel(e: WheelEvent) {
    if (Math.abs(this.wheel) > 4500) {
      this.wheel = 0;
    }
    this.wheel += e.deltaY;

    // カメラが向くまで非表示のsprite切り替え
    if (this.wheel < 0) {
      this.spriteObj![0].visible = this.wheel > -1000;
      this.spriteObj![1].visible = this.wheel > -1500;
    } else {
      this.spriteObj![0].visible = this.wheel > 1000;
      this.spriteObj![1].visible = this.wheel > 2000;
    }

    this.mixer?.forEach(mixer => {
      mixer.setTime(this.wheel / 1000);
      this.renderer?.render(this.scene!, this.camera!);
    })

    if (this.onWheelChange) {
      this.onWheelChange(this.wheel);
    }
  }

  updateBackground(isDarkMode: boolean) {
    this.isDarkMode = isDarkMode;
    this.canvas.style.background = isDarkMode
      ? 'linear-gradient(to bottom, #0a0e27, #2d3748)'  // 夜空: 濃い夜空→少し明るめ
      : 'linear-gradient(to bottom, #a1d2e6, #F0F8FF)';  // 青空: 柔らかい青→淡い青（抑えめ）
    this.adjustLightIntensity();
    // ダークモード限定オブジェクトの表示切り替え
    if (this.scene) {
      this.scene.background = null; // CSS背景グラデーションを使用
      this.gltfModel!.children.forEach((child) => {
        if (child.name.includes('kagaribi')) {
          child.visible = this.isDarkMode;
        }
      });
      this.scene!.children.forEach(child => {
        if (child instanceof THREE.AmbientLight) {
          child.intensity = !this.isDarkMode ? 0.5 : 0.05;
        }
      });
      // fog切り替え
      if (this.scene) {
        this.scene.fog!.color = new THREE.Color(!this.isDarkMode ? 0xcfd8dc : 0x0a0e27);
      }
      this.renderer!.render(this.scene!, this.camera!);
    }
  }

  private startAnimation() {
    const animate = () => {
      if (!this.run) return;

      this.animationId = requestAnimationFrame(animate);

      if (this.stats) {
        this.stats.update();
      }
      if (this.showDebug) {
        console.log(this.renderer?.info.render.calls);
      }
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    };

    this.run = true;
    animate();
  }

  stop() {
    this.run = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  dispose() {
    this.stop();
    
    if (this.renderer) {
      this.renderer.dispose();
    }
    
    if (this.scene) {
      this.scene.clear();
    }
  }

  resize() {
    if (!this.camera || !this.renderer) return;

    // 画面サイズに応じてCanvasサイズを再計算
    const width = window.innerWidth;
    const height = this.isMobile() ? width * (8/6) : width * (9/16);

    // Canvasサイズを更新
    this.canvas.width = width;
    this.canvas.height = height;

    // PerspectiveCameraの場合のみアスペクト比を更新
    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }
    this.renderer.setSize(width, height);
  }

  async createSprite(text: string[], index: number) {
    const canvas = await this.createCanvasForTexture(text, index);
    if (!canvas) {
      return;
    }
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    return sprite;
  }

  private async createCanvasForTexture(text: string[], index: number) {
    const canvasWidth = 800;
    const canvasHeight = 800;
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    ctx.fillStyle = 'black';
    text.forEach((line, idx)=> {
      ctx.font = idx === 0 ? 'bold 28px Arial' : 'normal 20px Arial';
      ctx.fillText(line, (canvasWidth - ctx.measureText(line).width) / 2, 180 + idx * 40 + (idx > 0 ? 20 : 0));
    });

    // ロゴ追加（2番目のcanvasのみ）
    if (index === 1) {
      await this.createSkillLogo(ctx, canvasWidth, canvasHeight, text);
    }

    return canvas;
  }

  private async createSkillLogo(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number, text: string[]) {
    const [nodejsLogoUrl, pythonLogoUrl, svelteLogoUrl, blenderLogoUrl, threeLogoUrl] = logoList as string[];

    const loadImage = (url: string) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(err);
        img.src = url;
      });

    try {
      const [
        nodejsImg,
        pythonImg,
        svelteImg,
        blenderImg,
        threeImg,
      ] = await Promise.all([
        loadImage(nodejsLogoUrl),
        loadImage(pythonLogoUrl),
        loadImage(svelteLogoUrl),
        loadImage(blenderLogoUrl),
        loadImage(threeLogoUrl),
      ]);

      const logoSize = 40;
      const gap = 20;
      const totalWidth = logoSize * 5 + gap * 4;
      const logoXStart = (canvasWidth - totalWidth) / 2;
      const logoYBase = 150 + (text.length - 1) * 40 + (text.length > 1 ? 20 : 0) + 40 + 30;

      const logos = [nodejsImg, pythonImg, svelteImg, blenderImg, threeImg];
      logos.forEach((img, i) => {
        const x = logoXStart + i * (logoSize + gap);
        ctx.drawImage(img, x, logoYBase, logoSize, logoSize);
      });

      // 末尾テキスト「etc.」を右寄せで表示
      const footer = 'etc.';
      const padding = 250;
      ctx.font = 'italic 18px Arial';
      ctx.fillStyle = '#4b5563'; // gray-600
      const footerWidth = ctx.measureText(footer).width;
      const footerX = canvasWidth - padding - footerWidth;
      const footerY = logoYBase + logoSize + 36;
      ctx.fillText(footer, footerX, footerY);
    } catch (error) {
      console.error('Logo load error:', error);
    }
  }

  private adjustLightIntensity() {
    if (!this.gltfModel) {
      return;
    }
    this.gltfModel.children.forEach((child) => {
      // glb内のライト強さ調節
      if (child instanceof THREE.DirectionalLight) {
        if (child.name === 'light_key') {
          child.intensity = !this.isDarkMode ? 2.5 : 0.1;
        } else {
          child.intensity = !this.isDarkMode ? 1 : 0;
        }
        child.castShadow = child.name === 'light_key' ? true : false;
        child.shadow.bias = -0.0008;
      }
      // ダークモード用篝火ライトの初期値
      if (child.name.includes('kagaribi')) {
        child.visible = this.isDarkMode;
        child.children.filter((pointLight: THREE.Object3D) => pointLight instanceof THREE.PointLight).forEach((light: THREE.PointLight) => {
          light.intensity = 1;
          light.distance = 5;
          light.decay = 2;
          light.castShadow = true;
          light.position.y += 0.05;
          light.position.z += 0.05;
          light.shadow.bias = 0.008;
        });
      }
    });
  }

  isMobile(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    // 画面幅が768px以下かつ縦向きの場合のみtrue
    return window.innerWidth <= 768 && window.innerHeight > window.innerWidth;
  }
}
