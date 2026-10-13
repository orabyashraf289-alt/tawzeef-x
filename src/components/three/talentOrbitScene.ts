import {
  ACESFilmicToneMapping, BufferGeometry, CapsuleGeometry, Color, DirectionalLight,
  Float32BufferAttribute, Group, HemisphereLight, IcosahedronGeometry, Line,
  LineBasicMaterial, Mesh, MeshStandardMaterial, PerspectiveCamera, Points,
  PointsMaterial, Scene, SphereGeometry, SRGBColorSpace, TorusGeometry, Vector2,
  Vector3, WebGLRenderer, type Material,
} from "three";

export interface TalentOrbitController {
  setVisible: (visible: boolean) => void;
  dispose: () => void;
}

/** A small, texture-free scene: the Tawzeef X connects orbiting talent nodes. */
export function createTalentOrbit(host: HTMLElement, onFailure: () => void): TalentOrbitController {
  const geometries: BufferGeometry[] = [];
  const materials: Material[] = [];
  const geometry = <T extends BufferGeometry>(value: T) => { geometries.push(value); return value; };
  const material = <T extends Material>(value: T) => { materials.push(value); return value; };
  const removeListeners: (() => void)[] = [];
  let renderer: WebGLRenderer | undefined;
  let resizeObserver: ResizeObserver | undefined;
  let themeObserver: MutationObserver | undefined;
  let frame = 0;
  let visible = false;
  let disposed = false;
  let previousFrame = 0;
  let elapsed = 0;

  const stop = () => { cancelAnimationFrame(frame); frame = 0; previousFrame = 0; };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    stop();
    resizeObserver?.disconnect();
    themeObserver?.disconnect();
    removeListeners.forEach((remove) => remove());
    geometries.forEach((value) => value.dispose());
    materials.forEach((value) => value.dispose());
    renderer?.dispose();
    renderer?.forceContextLoss();
    renderer?.domElement.remove();
  };

  try {
    renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power", failIfMajorPerformanceCaveat: true });
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.className = "talent-orbit-canvas";
    renderer.domElement.setAttribute("aria-hidden", "true");
    host.appendChild(renderer.domElement);

    const scene = new Scene();
    const camera = new PerspectiveCamera(36, 1, 0.1, 30);
    camera.position.set(0, 0.15, 4.8);
    camera.lookAt(0, 0, 0);
    scene.add(new HemisphereLight(0xd8fff4, 0x17364c, 3));
    const keyLight = new DirectionalLight(0xffffff, 3.4);
    keyLight.position.set(3, 4, 5);
    scene.add(keyLight);
    const rimLight = new DirectionalLight(0x6ee7b7, 2.2);
    rimLight.position.set(-4, -1, 2);
    scene.add(rimLight);

    const world = new Group();
    scene.add(world);
    const emerald = material(new MeshStandardMaterial({ color: 0x008c76, metalness: 0.45, roughness: 0.24 }));
    const mint = material(new MeshStandardMaterial({ color: 0x65d4bd, metalness: 0.35, roughness: 0.3 }));
    const gold = material(new MeshStandardMaterial({ color: 0xd9ae72, metalness: 0.5, roughness: 0.32 }));
    const connectors = material(new LineBasicMaterial({ color: 0x149c90, transparent: true, opacity: 0.24 }));

    const core = new Group();
    const beam = geometry(new CapsuleGeometry(0.12, 0.75, 4, 12));
    [-0.65, 0.65].forEach((angle) => {
      const mesh = new Mesh(beam, emerald);
      mesh.rotation.z = angle;
      core.add(mesh);
    });
    const shellMaterial = material(new MeshStandardMaterial({ color: 0x78e3cc, transparent: true, opacity: 0.12, wireframe: true }));
    core.add(new Mesh(geometry(new IcosahedronGeometry(0.68, 1)), shellMaterial));
    world.add(core);

    const nodeShape = geometry(new SphereGeometry(0.09, 16, 12));
    const orbits = [1.28, 1.7].map((radius, index) => {
      const orbit = new Group();
      orbit.rotation.set(index ? 1.05 : 0.65, index ? -0.35 : 0.4, index ? 0.5 : -0.3);
      orbit.add(new Mesh(geometry(new TorusGeometry(radius, index ? 0.009 : 0.019, 8, 96)), index ? mint : emerald));
      for (let i = 0; i < 3; i++) {
        const angle = i * Math.PI * 2 / 3 + index * 0.7;
        const point = new Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
        const node = new Mesh(nodeShape, i === 2 ? gold : mint);
        node.position.copy(point);
        node.scale.setScalar(i === 0 ? 1.35 : 0.8);
        orbit.add(node);
        orbit.add(new Line(geometry(new BufferGeometry().setFromPoints([new Vector3(), point])), connectors));
      }
      world.add(orbit);
      return orbit;
    });

    const points: number[] = [];
    for (let i = 0; i < 32; i++) {
      const angle = i * 2.39996;
      const radius = 1.5 + (i % 7) * 0.11;
      points.push(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.55, -0.5 + (i % 5) * 0.12);
    }
    const dust = new Points(
      geometry(new BufferGeometry().setAttribute("position", new Float32BufferAttribute(points, 3))),
      material(new PointsMaterial({ color: 0x38bdae, size: 0.024, transparent: true, opacity: 0.65 })),
    );
    world.add(dust);

    const pointer = new Vector2();
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const onPointerMove = (event: PointerEvent) => {
      if (!finePointer.matches) return;
      const rect = host.getBoundingClientRect();
      pointer.set((event.clientX - rect.left) / rect.width - 0.5, (event.clientY - rect.top) / rect.height - 0.5);
    };
    const onPointerLeave = () => pointer.set(0, 0);
    const onContextLost = (event: Event) => { event.preventDefault(); stop(); onFailure(); };
    host.addEventListener("pointermove", onPointerMove);
    host.addEventListener("pointerleave", onPointerLeave);
    renderer.domElement.addEventListener("webglcontextlost", onContextLost);
    removeListeners.push(() => {
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerleave", onPointerLeave);
      renderer?.domElement.removeEventListener("webglcontextlost", onContextLost);
    });

    const render = () => { renderer!.render(scene, camera); };
    const resize = () => {
      if (disposed) return;
      const { width, height } = host.getBoundingClientRect();
      if (!width || !height) return;
      renderer!.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 500 ? 1.25 : 1.5));
      renderer!.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      render();
    };
    const updateTheme = () => {
      const dark = document.documentElement.classList.contains("dark");
      emerald.color = new Color(dark ? 0x26c7a2 : 0x008c76);
      connectors.opacity = dark ? 0.42 : 0.24;
      if (visible) render();
    };
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    themeObserver = new MutationObserver(updateTheme);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    updateTheme();
    resize();

    const tick = (now: number) => {
      if (disposed || !visible) return;
      // Render at most 30fps; cap delta after tab switches to prevent jumps.
      if (!previousFrame || now - previousFrame >= 1000 / 30) {
        const delta = previousFrame ? Math.min((now - previousFrame) / 1000, 0.05) : 0;
        previousFrame = now;
        elapsed += delta;
        world.rotation.y += (pointer.x * 0.35 - world.rotation.y) * 0.06;
        world.rotation.x += (pointer.y * 0.22 - world.rotation.x) * 0.06;
        core.position.y = Math.sin(elapsed * 0.8) * 0.045;
        core.rotation.y = Math.sin(elapsed * 0.3) * 0.14;
        orbits[0].rotation.z -= delta * 0.07;
        orbits[1].rotation.z += delta * 0.05;
        try { render(); } catch { stop(); onFailure(); return; }
      }
      frame = requestAnimationFrame(tick);
    };

    return {
      setVisible(next) {
        if (disposed || next === visible) return;
        visible = next;
        if (visible) frame = requestAnimationFrame(tick);
        else stop();
      },
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
