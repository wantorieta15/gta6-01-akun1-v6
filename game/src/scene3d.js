// The 3D city: a three.js sunset over Solmar Bay — ocean and sand to the west,
// a street grid of lit towers, palms along the beachfront, traffic, a police
// helicopter with a searchlight, and the player's car and character.
import * as THREE from 'three';
import { CITY, PALETTE } from './config.js';

function makeWindowTexture(seedHue) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#232a3d';
  ctx.fillRect(0, 0, 64, 128);
  for (let y = 6; y < 122; y += 12) {
    for (let x = 5; x < 58; x += 11) {
      const lit = ((x * 7 + y * 13 + seedHue * 97) % 10) < 4;
      ctx.fillStyle = lit ? '#ffd27a' : '#12182a';
      ctx.fillRect(x, y, 7, 8);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeRoadTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#3a3f4d';
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = '#c8cdd8';
  ctx.lineWidth = 3;
  ctx.setLineDash([18, 16]);
  ctx.beginPath();
  ctx.moveTo(256, 0);
  ctx.lineTo(256, 512);
  ctx.moveTo(0, 256);
  ctx.lineTo(512, 256);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = '#8a8f9e';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, 506, 506);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildCarMesh(color, isPolice) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.6 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x0e1626, roughness: 0.1, metalness: 0.9 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.62, 4.4), bodyMat);
  body.position.y = 0.55;
  group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.6, 2.2), glassMat);
  cabin.position.set(0, 1.1, -0.25);
  group.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 12);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
  for (const [x, z] of [[-1.0, 1.4], [1.0, 1.4], [-1.0, -1.4], [1.0, -1.4]]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.36, z);
    group.add(wheel);
  }
  if (isPolice) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.22, 0.4),
      new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xaa0000, emissiveIntensity: 1.4 }));
    bar.position.set(0, 1.5, -0.25);
    group.add(bar);
    const bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x2244ff, emissive: 0x0022aa, emissiveIntensity: 1.4 }));
    bar2.position.set(0.8, 1.5, -0.25);
    group.add(bar2);
  }
  const head = new THREE.PointLight(0xffe9a8, 0, 18, 1.6);
  head.position.set(0, 0.8, 2.4);
  group.add(head);
  group.userData.headlight = head;
  return group;
}

function buildPersonMesh(shirtColor) {
  const group = new THREE.Group();
  const shirt = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.8 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xe8b98a, roughness: 0.7 });
  const pants = new THREE.MeshStandardMaterial({ color: 0x2a2f45, roughness: 0.85 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.78, 0.36), shirt);
  torso.position.y = 1.05;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), skin);
  head.position.y = 1.68;
  group.add(head);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.32), pants);
  legs.position.y = 0.35;
  group.add(legs);
  return group;
}

function buildPalm(scale) {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.26, 5.2, 7),
    new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: 0.95 }),
  );
  trunk.position.y = 2.6;
  trunk.rotation.z = 0.08;
  group.add(trunk);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f8f4e, roughness: 0.8, side: THREE.DoubleSide });
  for (let i = 0; i < 6; i += 1) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.55, 3.4, 4), leafMat);
    const a = (i / 6) * Math.PI * 2;
    leaf.position.set(Math.cos(a) * 1.1, 5.3, Math.sin(a) * 1.1);
    leaf.rotation.z = Math.cos(a) * 1.1;
    leaf.rotation.x = -Math.sin(a) * 1.1;
    group.add(leaf);
  }
  group.scale.setScalar(scale);
  return group;
}

export function createScene3D(canvas, world) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xcf7a4d, 180, 620);
  // Sunset gradient sky dome.
  const skyGeo = new THREE.SphereGeometry(900, 24, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color(PALETTE.skyTop) },
      mid: { value: new THREE.Color(PALETTE.skyMid) },
      low: { value: new THREE.Color(PALETTE.skyLow) },
    },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 low; void main(){ float h = normalize(vP).y; vec3 c = h > 0.25 ? mix(mid, top, smoothstep(0.25, 0.75, h)) : mix(low, mid, smoothstep(-0.08, 0.25, h)); gl_FragColor = vec4(c, 1.0); }',
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));

  // Low sun over the ocean, west.
  const sun = new THREE.Mesh(
    new THREE.CircleGeometry(46, 32),
    new THREE.MeshBasicMaterial({ color: PALETTE.sun, fog: false }),
  );
  sun.position.set(-820, 62, 40);
  sun.lookAt(0, 40, 40);
  scene.add(sun);
  const sunGlow = new THREE.Mesh(
    new THREE.CircleGeometry(80, 32),
    new THREE.MeshBasicMaterial({ color: 0xff9a3d, transparent: true, opacity: 0.12, fog: false }),
  );
  sunGlow.position.set(-824, 62, 40);
  sunGlow.lookAt(0, 40, 40);
  scene.add(sunGlow);

  const hemi = new THREE.HemisphereLight(0xffc98a, 0x2a1e4d, 1.0);
  scene.add(hemi);
  // Warm fill from the east so the towers' shadow sides are never pitch black.
  const fill = new THREE.DirectionalLight(0xff9a6a, 0.55);
  fill.position.set(260, 90, -60);
  scene.add(fill);
  const sunLight = new THREE.DirectionalLight(0xffb060, 2.0);
  sunLight.position.set(-260, 120, 60);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.left = -260;
  sunLight.shadow.camera.right = 260;
  sunLight.shadow.camera.top = 260;
  sunLight.shadow.camera.bottom = -260;
  sunLight.shadow.camera.far = 700;
  scene.add(sunLight);

  // Ground: city slab, sand strip, ocean.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(680, 680),
    new THREE.MeshStandardMaterial({ map: makeRoadTexture(), roughness: 0.95 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, 0);
  ground.receiveShadow = true;
  scene.add(ground);
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(46, 680),
    new THREE.MeshStandardMaterial({ color: PALETTE.sand, roughness: 1 }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(-363, 0.05, 0);
  sand.receiveShadow = true;
  scene.add(sand);
  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(420, 680),
    new THREE.MeshStandardMaterial({ color: PALETTE.ocean, roughness: 0.25, metalness: 0.35 }),
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(-600, -0.4, 0);
  scene.add(ocean);

  // Buildings with lit windows.
  const buildingGroup = new THREE.Group();
  for (const b of world.buildings) {
    const mat = new THREE.MeshStandardMaterial({
      map: makeWindowTexture(b.hue),
      roughness: 0.85,
      color: new THREE.Color().setHSL(0.62 + b.hue * 0.08, 0.25, 0.55 + b.hue * 0.2),
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), mat);
    mesh.position.set(b.x, b.h / 2, b.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    buildingGroup.add(mesh);
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(b.w * 0.5, 2.2, b.d * 0.5),
      new THREE.MeshStandardMaterial({ color: 0x3a3f52, roughness: 0.9 }),
    );
    roof.position.set(b.x, b.h + 1.1, b.z);
    buildingGroup.add(roof);
  }
  scene.add(buildingGroup);

  // Palms along the beachfront.
  for (const p of world.palms) {
    const palm = buildPalm(p.s);
    palm.position.set(p.x, 0, p.z);
    palm.castShadow = true;
    scene.add(palm);
  }

  // Beach props: umbrellas, kiosks, sailboats, for the Sunsplash mission beach.
  const beachGroup = new THREE.Group();
  const umbrellaMat = new THREE.MeshStandardMaterial({ color: 0xff5d8f, roughness: 0.7, side: THREE.DoubleSide });
  const umbrellaMat2 = new THREE.MeshStandardMaterial({ color: 0x4fd2ff, roughness: 0.7, side: THREE.DoubleSide });
  for (let i = 0; i < 12; i += 1) {
    const x = -352 + (i % 4) * 7;
    const z = -180 + Math.floor(i / 4) * 130 + (i % 3) * 9;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.6, 6),
      new THREE.MeshStandardMaterial({ color: 0xd9d9d9 }));
    pole.position.set(x, 1.3, z);
    beachGroup.add(pole);
    const top = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.1, 8), i % 2 === 0 ? umbrellaMat : umbrellaMat2);
    top.position.set(x, 2.9, z);
    beachGroup.add(top);
  }
  const kioskMat = new THREE.MeshStandardMaterial({ color: 0xffd23d, roughness: 0.8 });
  for (const [x, z] of [[-344, -40], [-344, 130], [-344, 210]]) {
    const kiosk = new THREE.Mesh(new THREE.BoxGeometry(4.5, 3, 3.5), kioskMat);
    kiosk.position.set(x, 1.5, z);
    kiosk.castShadow = true;
    beachGroup.add(kiosk);
  }
  const sailMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, side: THREE.DoubleSide });
  for (const [x, z] of [[-430, -120], [-470, 90], [-410, 220]]) {
    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.9, 6.5),
      new THREE.MeshStandardMaterial({ color: 0x8a5a3a, roughness: 0.7 }));
    hull.position.set(x, 0.4, z);
    beachGroup.add(hull);
    const sail = new THREE.Mesh(new THREE.ConeGeometry(2.4, 7, 4), sailMat);
    sail.position.set(x, 4.4, z);
    sail.scale.z = 0.25;
    beachGroup.add(sail);
  }
  scene.add(beachGroup);

  // Cars: player car, parked cars, traffic, police pool.
  const carMeshes = new Map();
  function registerCar(car, isPolice) {
    const mesh = buildCarMesh(car.color ?? 0xd94f3d, isPolice);
    mesh.castShadow = true;
    scene.add(mesh);
    carMeshes.set(car, mesh);
    return mesh;
  }
  registerCar(world.playerCar, false);
  for (const car of world.parked) registerCar(car, false);
  for (const car of world.traffic) registerCar(car, false);
  const policeMeshes = [];
  for (let i = 0; i < 5; i += 1) {
    const mesh = buildCarMesh(0x11131a, true);
    mesh.visible = false;
    scene.add(mesh);
    policeMeshes.push(mesh);
  }

  // Player character on foot.
  const playerMesh = buildPersonMesh(0xff6a2a);
  playerMesh.visible = false;
  playerMesh.castShadow = true;
  scene.add(playerMesh);
  const pedMeshes = world.pedestrians.map((p) => {
    const m = buildPersonMesh(p.shirt);
    m.castShadow = true;
    scene.add(m);
    return m;
  });

  // Police helicopter with a searchlight cone.
  const heli = new THREE.Group();
  const heliBody = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.8, 6.2),
    new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.4, metalness: 0.3 }));
  heli.add(heliBody);
  const heliGlass = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.1, 1.8),
    new THREE.MeshStandardMaterial({ color: 0x0e1626, roughness: 0.15, metalness: 0.8 }));
  heliGlass.position.set(0, 0.1, 2.4);
  heli.add(heliGlass);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 5.4),
    new THREE.MeshStandardMaterial({ color: 0xd9d9d9, roughness: 0.5 }));
  tail.position.set(0, 0.4, -5.2);
  heli.add(tail);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(11, 0.12, 0.7),
    new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6 }));
  rotor.position.y = 1.25;
  heli.add(rotor);
  const spot = new THREE.SpotLight(0xfff2c0, 900, 160, 0.32, 0.45, 1.2);
  spot.position.set(0, -0.8, 0);
  heli.add(spot);
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0xfff2c0, transparent: true, opacity: 0.13,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(9, 34, 20, 1, true), coneMat);
  cone.position.y = -17;
  heli.add(cone);
  heli.visible = false;
  scene.add(heli);
  const heliTarget = new THREE.Object3D();
  scene.add(heliTarget);

  // Mission waypoint beacon.
  const beacon = new THREE.Group();
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.6, 90, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd23d, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }),
  );
  beam.position.y = 45;
  beacon.add(beam);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(5, 0.35, 8, 32),
    new THREE.MeshBasicMaterial({ color: 0xffd23d }));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.4;
  beacon.add(ring);
  scene.add(beacon);

  // Explosions pool: fireball + smoke + light.
  const explosionPool = [];
  for (let i = 0; i < 6; i += 1) {
    const g = new THREE.Group();
    const fire = new THREE.Mesh(new THREE.SphereGeometry(4, 14, 12),
      new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.9 }));
    g.add(fire);
    const smoke = new THREE.Mesh(new THREE.SphereGeometry(6, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.5 }));
    smoke.position.y = 3;
    g.add(smoke);
    const light = new THREE.PointLight(0xff8c2a, 0, 60, 1.5);
    light.position.y = 4;
    g.add(light);
    g.visible = false;
    g.userData = { fire, smoke, light };
    scene.add(g);
    explosionPool.push(g);
  }

  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 2000);
  const camState = { angle: 0, dist: 14, height: 6 };

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  function syncCarMesh(car) {
    const mesh = carMeshes.get(car);
    if (!mesh) return;
    mesh.position.set(car.x, 0, car.z);
    mesh.rotation.y = car.heading;
    mesh.userData.headlight.intensity = 60;
  }

  // Title orbit: locked to face the beach and the sunset — the camera sits on
  // the beachfront road looking west over the sand, the ocean and the low sun,
  // and only sways a little, so it never swings around to the dark towers.
  function titleCamera(time) {
    const sway = Math.sin(time * 0.12) * 5;
    camera.position.set(-292, 8 + Math.sin(time * 0.2) * 0.6, 51 + sway);
    camera.lookAt(-340, 3.5, 46 + sway * 0.5);
  }

  function chaseCamera(player, car, dt, wanted) {
    const target = car ?? player;
    const heading = target.heading;
    const dist = car ? 11 : 8;
    const height = car ? 4.6 : 3.8;
    const backX = target.x - Math.sin(heading) * dist;
    const backZ = target.z - Math.cos(heading) * dist;
    const k = 1 - Math.pow(0.001, dt);
    camera.position.x += (backX - camera.position.x) * k;
    camera.position.y += (height - camera.position.y) * k;
    camera.position.z += (backZ - camera.position.z) * k;
    const lookX = target.x + Math.sin(heading) * 8;
    const lookZ = target.z + Math.cos(heading) * 8;
    // When the heli is up, tilt the view a little so its searchlight clears
    // the top of the frame — but not so far that the player's car drops
    // behind the dialog panel.
    camera.lookAt(lookX, wanted >= 3 ? 3.5 : 2.2, lookZ);
  }

  function render(worldState, mode, time, dt) {
    const s = worldState;
    for (const car of [world.playerCar, ...world.parked, ...world.traffic]) syncCarMesh(car);
    // Police meshes follow the active police cars.
    let pi = 0;
    for (const p of world.police) {
      if (!p.active) continue;
      const mesh = policeMeshes[pi % policeMeshes.length];
      mesh.visible = true;
      mesh.position.set(p.x, 0, p.z);
      mesh.rotation.y = p.heading;
      mesh.userData.headlight.intensity = 60;
      pi += 1;
    }
    for (let i = pi; i < policeMeshes.length; i += 1) policeMeshes[i].visible = false;

    // Player character on foot.
    if (s.inCar) {
      playerMesh.visible = false;
    } else {
      playerMesh.visible = true;
      playerMesh.position.set(s.player.x, 0, s.player.z);
      playerMesh.rotation.y = s.player.heading;
    }
    // Pedestrians.
    for (let i = 0; i < world.pedestrians.length; i += 1) {
      const p = world.pedestrians[i];
      const m = pedMeshes[i];
      m.position.set(p.x, 0, p.z);
      m.rotation.y = p.heading;
    }
    // Helicopter above the player when wanted is 3 or more.
    if (s.wanted >= 3) {
      heli.visible = true;
      const a = time * 0.35;
      heli.position.set(s.player.x + Math.cos(a) * 30, 30 + Math.sin(time * 0.5) * 1.5, s.player.z + Math.sin(a) * 30);
      rotor.rotation.y = time * 22;
      heliTarget.position.set(s.player.x, 0, s.player.z);
      spot.target = heliTarget;
    } else {
      heli.visible = false;
    }
    // Waypoint beacon at the mission target.
    const target = world.missionTarget();
    beacon.position.set(target.x, 0, target.z);
    ring.rotation.z = time * 0.8;
    beam.material.opacity = 0.28 + Math.sin(time * 3) * 0.1;
    // Explosions.
    for (let i = 0; i < explosionPool.length; i += 1) {
      const g = explosionPool[i];
      const e = world.explosions[i];
      if (!e) {
        g.visible = false;
        continue;
      }
      const t = 1 - e.life / e.max;
      g.visible = true;
      g.position.set(e.x, 1.5, e.z);
      g.userData.fire.scale.setScalar(0.4 + t * 2.2);
      g.userData.fire.material.opacity = Math.max(0, 0.95 - t);
      g.userData.smoke.scale.setScalar(0.6 + t * 2.6);
      g.userData.smoke.material.opacity = Math.max(0, 0.55 - t * 0.5);
      g.userData.light.intensity = Math.max(0, 320 * (1 - t));
    }
    // Ocean shimmer.
    ocean.position.y = -0.4 + Math.sin(time * 0.7) * 0.08;
    // Camera.
    if (mode === 'title') titleCamera(time);
    else if (mode === 'map') {
      camera.position.set(s.player.x, 190, s.player.z + 0.01);
      camera.lookAt(s.player.x, 0, s.player.z);
    } else {
      chaseCamera(s.player, s.inCar ? s.car : null, dt, s.wanted);
    }
    renderer.render(scene, camera);
  }

  return { render, resize, scene, camera };
}
