// Three.js Scene Setup for Voxel Look
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.125.2/build/three.module.js';

const canvas = document.querySelector('#three-canvas');
const container = canvas.parentElement;

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xFFFFFF); // Match bg-neutral-900

// Camera - Orthographic for Voxel/Isometric look
const aspect = container.clientWidth && container.clientHeight ? container.clientWidth / container.clientHeight : 1;
const d = 20; // View size
const camera = new THREE.OrthographicCamera(
    -d * aspect, d * aspect,
    d, -d,
    1, 1000
);

// Position camera for isometric view
// Looking down from a 45-degree angle
camera.position.set(80, 80, 80);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
});
if (container.clientWidth && container.clientHeight) {
    renderer.setSize(container.clientWidth, container.clientHeight);
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);

// Cityscape Generation
const gridSize = 100;
const maxColumnHeight = 20;
const offset = (gridSize - 1) / 2;

// Data structures
const targetHeights = new Float32Array(gridSize * gridSize);
const currentHeights = new Float32Array(gridSize * gridSize);
const activeColumns = new Set(); // Indices of columns that are currently animating

// InstancedMesh for Cubes
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
const meshInstances = new THREE.InstancedMesh(geometry, material, gridSize * gridSize * maxColumnHeight);
scene.add(meshInstances);

// InstancedMesh for Edges
const edgeColor = canvas.getAttribute('data-edge-color') || '#33b5e5';
const edgesGeometry = new THREE.BoxGeometry(1.02, 1.02, 1.02);
const edgesMaterial = new THREE.MeshBasicMaterial({ color: edgeColor, wireframe: true });
const edgeInstances = new THREE.InstancedMesh(edgesGeometry, edgesMaterial, gridSize * gridSize * maxColumnHeight);
scene.add(edgeInstances);

const dummy = new THREE.Object3D();

function updateColumn(index) {
    const x = Math.floor(index / gridSize);
    const z = index % gridSize;
    const height = currentHeights[index];
    const baseIndex = index * maxColumnHeight;

    for (let y = 0; y < maxColumnHeight; y++) {
        const instanceIndex = baseIndex + y;

        if (y < Math.floor(height)) {
            // Full cube
            dummy.position.set(x - offset, y + 0.5, z - offset);
            dummy.scale.set(1, 1, 1);
        } else if (y < height) {
            // Top partial cube
            const fraction = height - y;
            dummy.position.set(x - offset, y + fraction / 2, z - offset);
            dummy.scale.set(1, fraction, 1);
        } else {
            // Hidden cube
            dummy.scale.set(0, 0, 0);
        }

        dummy.updateMatrix();
        meshInstances.setMatrixAt(instanceIndex, dummy.matrix);
        edgeInstances.setMatrixAt(instanceIndex, dummy.matrix);
    }
}

// Initialize Grid
for (let i = 0; i < gridSize * gridSize; i++) {
    const h = Math.floor(Math.random() * 5) + 1;
    targetHeights[i] = h;
    currentHeights[i] = h;
    updateColumn(i);
}
meshInstances.instanceMatrix.needsUpdate = true;
edgeInstances.instanceMatrix.needsUpdate = true;

// Animation Loop for Cityscape (Logic)
setInterval(() => {
    const chunkWidth = Math.floor(Math.random() * 10) + 1;
    const chunkDepth = Math.floor(Math.random() * 10) + 1;
    const startX = Math.floor(Math.random() * (gridSize - chunkWidth + 1));
    const startZ = Math.floor(Math.random() * (gridSize - chunkDepth + 1));
    const add = Math.random() > 0.5;

    for (let x = startX; x < startX + chunkWidth; x++) {
        for (let z = startZ; z < startZ + chunkDepth; z++) {
            const i = x * gridSize + z;
            if (add) {
                if (targetHeights[i] < maxColumnHeight) {
                    targetHeights[i]++;
                    activeColumns.add(i);
                }
            } else {
                if (targetHeights[i] > 1) {
                    targetHeights[i]--;
                    activeColumns.add(i);
                }
            }
        }
    }
}, 500);

// Resize Handling
window.addEventListener('resize', () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height) return;

    const newAspect = width / height;

    camera.left = -d * newAspect;
    camera.right = d * newAspect;
    camera.top = d;
    camera.bottom = -d;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
});

// Animation Loop (Render)
function animate() {
    requestAnimationFrame(animate);

    if (activeColumns.size > 0) {
        for (const i of activeColumns) {
            const diff = targetHeights[i] - currentHeights[i];
            if (Math.abs(diff) < 0.01) {
                currentHeights[i] = targetHeights[i];
                activeColumns.delete(i);
            } else {
                currentHeights[i] += diff * 0.1; // Smooth step
            }
            updateColumn(i);
        }
        meshInstances.instanceMatrix.needsUpdate = true;
        edgeInstances.instanceMatrix.needsUpdate = true;
    }

    if (container.clientWidth && container.clientHeight) {
        renderer.render(scene, camera);
    }
}

animate();
