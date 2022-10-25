import * as THREE from "three";
import * as Tone from "tone";
import { Noise } from "noisejs";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import "./styles.css";

let numMovers, movers, synths;
let musicalScale;
let gridHelper;
let sceneHeight, sceneWidth;
let scene, camera, renderer;
let colour, intensity, light;
let ambientlight;
let orbit;
let listener, sound, audioLoader;
let clock, delta, interval;

let startButton = document.getElementById("startButton");
startButton.addEventListener("click", init);

function init() {
  let overlay = document.getElementById("overlay");
  overlay.remove();

  for (let i = 0; i < numMovers; i++) {
    let octave = parseInt(i / 12, 10);
    synths.push(
      new Tone.MonoSynth({
        oscillator: {
          type: "sawtooth"
        },
        envelope: {
          attack: 0.01
        }
      })
    );
    synths[i].toDestination();
    synths[i].triggerAttack(
      Tone.Frequency(freq, "midi") + Math.random(6),
      0,
      0.01
    );
    for (let j = 0; j < numMovers / 2; j++) {
      movers.push([]);

      movers[i].push(new Mover(i - 10, 0, j - 5, i * 0.25));
    }
  }

  clock = new THREE.Clock();
  delta = 0;
  interval = 1 / 2;

  sceneWidth = window.innerWidth;
  sceneHeight = window.innerHeight;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xdfdfdf);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  camera.position.z = 25;

  const color = 0xffffff;
  const density = 0.021;
  scene.fog = new THREE.FogExp2(color, density);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enableZoom = true;

  colour = 0xffffff;
  intensity = 1;
  light = new THREE.DirectionalLight(colour, intensity);
  light.position.set(-1, 2, 4);
  scene.add(light);
  ambientlight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientlight);

  //Grid
  gridHelper = new THREE.GridHelper(1000, 100);
  scene.add(gridHelper);

  numMovers = 36;
  movers = [];
  synths = [];
  musicalScale = [0, 4, 7, 11, 14];
  for (let i = 0; i < numMovers; i++) {
    let octave = parseInt(i / 12, 10);
    let freq = 36 + (musicalScale[i % 5] + octave * 12);
    synths.push(
      new Tone.MonoSynth({
        oscillator: {
          type: "sawtooth"
        },
        envelope: {
          attack: 0.01
        },
        volume: -Infinity,
        filter: {
          frequency: 20000
        },
        filterEnvelope: {
          baseFrequency: 3000
        }
      })
    );
    synths[i].toDestination();
    synths[i].triggerAttack(
      Tone.Frequency(freq, "midi") + Math.random(6),
      0,
      0.01
    );
    for (let j = 0; j < numMovers / 2; j++) {
      movers.push([]);

      movers[i].push(new Mover(i - 20, 0, j - 10, i * 0.25));
    }
  }
  window.addEventListener("resize", onWindowResize, false);
  play();
}

class Mover {
  constructor(x, y, z, offset) {
    this.x = x;
    this.y = y;
    this.z = z;

    this.angle = new THREE.Vector3(0, offset, 0);
    this.velocity = new THREE.Vector3(0.1, 0.01, 0.01);
    this.amplitude = new THREE.Vector3(0.5, 2.5, 0.5);
    this.geo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    this.mat = new THREE.MeshPhongMaterial({
      color: new THREE.Color(0.2, 0.2, 0.2)
    });
    this.box = new THREE.Mesh(this.geo, this.mat);
    this.box.position.set(this.x, this.z);
    this.noise = new Noise();
    this.noise.seed(THREE.MathUtils.randFloat());
    scene.add(this.box);
  }

  update() {
    let perl = this.noise.perlin2(this.angle.y, this.amplitude.y) * 3;
    this.angle.add(this.velocity);
    this.y = Math.sin(this.angle.y) * this.amplitude.y + perl;
  }

  display() {
    this.box.position.set(this.x, this.y, this.z);
    this.mat.color.set(new THREE.Color(this.y / 10, this.y, 0.4));
  }
}

function play() {
  renderer.setAnimationLoop(() => {
    update();
    render();
  });
}

function stop() {
  renderer.setAnimationLoop(null);
}

function update() {
  orbit.update();
  delta += clock.getDelta();

  for (let i = 0; i < numMovers; i++) {
    let boxPosMap = THREE.MathUtils.mapLinear(
      movers[i][0].box.position.y,
      -movers[i][0].amplitude.y / 10,
      movers[i][0].amplitude.y,
      -1,
      1
    );
    let boxPosMapClamp = THREE.MathUtils.clamp(boxPosMap, 0, 3);
    let boxPosGainTodB = Tone.gainToDb(boxPosMapClamp);
    synths[i].volume.linearRampTo(boxPosGainTodB, 0.01);
    for (let j = 0; j < numMovers / 2; j++) {
      movers[i][j].update();
    }
  }

  if (delta > interval) {
    for (let i = 0; i < numMovers; i++) {}
    delta = delta % interval;
  }
}

function render() {
  for (let i = 0; i < numMovers; i++) {
    for (let j = 0; j < numMovers / 2; j++) {
      movers[i][j].display();
    }
  }
  renderer.render(scene, camera);
}

function onWindowResize() {
  sceneHeight = window.innerHeight;
  sceneWidth = window.innerWidth;
  renderer.setSize(sceneWidth, sceneHeight);
  camera.aspect = sceneWidth / sceneHeight;
  camera.updateProjectionMatrix();
}
