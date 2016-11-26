var Colors = {
	red:0xf25346,
	white:0xd8d0d1,
	purewhite: 0xffffff,
	brown:0x59332e,
	pink:0xF5986E,
	brownDark:0x23190f,
	blue:0x68c3c0,
	black: 0x000000
};

var scene,
	camera, 
	fieldOfView, 
	aspectRatio, 
	nearPlane, 
	farPlane, 
	HEIGHT, 
	WIDTH,
	renderer, 
	container;

window.addEventListener('load', init, false);


/*
SETTING UP THE SCENE
*/
function init(event) {
	// set up the scene, the camera and the renderer
	// every obj needs to be added here in order to be rendered
	createScene();

	// add the lights: hemisphere light for atmosphere and directional light for shadows
	createLights();

	// add the objects (things to render)
	createPlane();
	createPlanet();
	createSky();

	// add listener
	document.addEventListener('mousemove', handleMouseMove, false);

	// play music
	var sample = document.getElementById("music");
	sample.play();

	// start a loop that will update the objects' positions 
	// and render the scene on each frame
	loop();
}


function createScene() {
	// use window dims to set aspec ratio of camera
	// and size of renderer
	HEIGHT = window.innerHeight;
	WIDTH = window.innerWidth;

	// create scene
	scene = new THREE.Scene();

	// add a fog effect to the scene;
	// same color as b/g color used in stylesheet
	scene.fog = new THREE.Fog(0xf7d9aa, 100, 950);

	// create camera and parameters
	aspectRatio = WIDTH / HEIGHT;
	fieldOfView = 60;
	nearPlane = 1;
	farPlane = 10000;
	camera = new THREE.PerspectiveCamera(
		fieldOfView,
		aspectRatio,
		nearPlane,
		farPlane
		);

	// set position of camera
	camera.position.x = 0;
	camera.position.y = 100;
	camera.position.z = 200;

	// create the renderer
	renderer = new THREE.WebGLRenderer({
		// allow transparency to show gradient b/g from css
		alpha: true,

		// beware: make less performant
		antialias: true,
	});

	// define size of renderer to fill screen
	renderer.setSize(WIDTH, HEIGHT);

	// enable shadow rendering
	renderer.shadowMap.enabled = true;

	// add dom elt of renderer to container we made in html
	container = document.getElementById('world');
	container.appendChild(renderer.domElement);

	// listen to screen
	// update camera and renderer size if user resizes window
	window.addEventListener('resize', handleWindowResize, false);
}


function handleWindowResize() {
	// update height and width of renderer and camera
	HEIGHT = window.innerHeight;
	WIDTH = window.innerWidth;
	renderer.setSize(WIDTH, HEIGHT);
	camera.aspect = WIDTH / HEIGHT;
	camera.updateProjectionMatrix();
}


/*
LIGHTS
*/
var hemisphereLight, shadowLight;

function createLights() {
	// hemisphere light is a gradient colored light
	// first param is sky, 2nd is ground, 3rd is intensity
	hemisphereLight = new THREE.HemisphereLight(0xaaaaaa,0x000000, .9);

	// directional light shines from specific direction
	// acts like sun, so all rays are parallel
	shadowLight = new THREE.DirectionalLight(0xfffff0, 0.9);

	// set direction of light
	shadowLight.position.set(150, 350, 350);

	// allow shadow casting
	shadowLight.castShadow = true;

	// define visible area of the projected shadow
	shadowLight.shadow.camera.left = -400;
	shadowLight.shadow.camera.right = 400;
	shadowLight.shadow.camera.top = 400;
	shadowLight.shadow.camera.bottom = -400;
	shadowLight.shadow.camera.near = 1;
	shadowLight.shadow.camera.far = 1000;

	// define resolution of shadow;
	// higher the better, but also more costly and less performant
	shadowLight.shadow.mapSize.width = 2048;
	shadowLight.shadow.mapSize.height = 2048;

	// ambient light modifies global color and softens shadows
	ambientLight = new THREE.AmbientLight(0xdc8874, .5);

	// add lights to scene
	scene.add(hemisphereLight);
	scene.add(shadowLight);
	scene.add(ambientLight);
}


/*
LANDSCAPE'S OBJECTS:
	1. Create geometry
	2. Create material
	3. Pass both into mesh
	4. Add mesh to scene
*/
Planet = function() {
	// geometry of cylinder: radius top, radius bottom, height, # segments on radius, # vert segments
	var geom = new THREE.CylinderGeometry(600, 600, 800, 40, 10);

	// rotate geometry on x-axis
	geom.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI/2));

	// get vertices
	var l = geom.vertices.length;

	// create array to store new data associated to each vertex
	this.surface = []

	for(var i=0; i<l; i++) {
		var v = geom.vertices[i]
		this.surface.push({x: v.x, y: v.y, z: v.z, ang: Math.random()*Math.PI*2, amp: 15 + Math.random()*15, speed: 0.010 + Math.random()*0.032})
	}; 

	// create land material
	var mat = new THREE.MeshPhongMaterial({
		color: Colors.brown, 
		opacity: 1, 
		transparent: false,
		shading: THREE.FlatShading,
	});

	// to create an object in Three.js, we have to create a mesh
	// which is combination of geometry and some material
	this.mesh = new THREE.Mesh(geom, mat);

	// allow planet to receive shadows
	this.mesh.receiveShadow = true;
}

Planet.prototype.moveWaves = function() {
	var verts = this.mesh.geometry.vertices;
	var l = verts.length;

	for(var i=0; i<l; i++) {
		var v = verts[i];

		// update position of vertex
		var vprops = this.surface[i];
		v.x = vprops.x + Math.cos(vprops.ang) * vprops.amp;
		v.y = vprops.y + Math.sin(vprops.ang) * vprops.amp;


		// increment angle for next frame
		vprops.ang += vprops.speed;
	}

	// tell renderer geometry has changed b/c it autocaches geometries
	// 	and won't do anything till we add this line
	this.mesh.geometry.verticesNeedUpdate = true;

	this.mesh.rotation.z += 0.005;
}

var planet;

function createPlanet() {
	planet = new Planet();

	// push a little bit at the bottom of the scene
	planet.mesh.position.y = -600;

	// add mesh (geom and material) of planet to scene
	scene.add(planet.mesh);
}

Asteroid = function() {
	// create empty container that will hold diff parts of cloud
	this.mesh = new THREE.Object3D();

	// create a cube geometry that is duplicated to make the cloud
	var geom = new THREE.DodecahedronGeometry(50);
	var mat = new THREE.MeshPhongMaterial({shading: THREE.FlatShading, transparent: false});
	mat.color.setHex( Math.random() * 0x000000 );
	var m = new THREE.Mesh(geom, mat);

	// create simple white material 
	// TODO not working!!! :(
	// var loader = new THREE.TextureLoader();
	// var img = new Image();
	// img.crossOrigin = "anonymous";
	// // img.src = "http://pbs.twimg.com/profile_images/604881411657605120/TPyY8ubB.jpg";
	// img.src = "http://sdg.repositoryhosting.com/git_public/sdg/sdg-blog.git/blob_plain/abced5687967687c3e429ddd18a38055d0439550:/Three-js-examples/images/clouds.jpg";
	// var tex = loader.load(img.src);  
	// var mat = new THREE.MeshPhongMaterial({map: tex, shininess: 100}); 
	// var mat = new THREE.MeshPhongMaterial({color: Colors.purewhite, specular: 0xffffff});

	// set position and rotation randomly per cube
	m.position.y = Math.random()*10;
	m.position.z = Math.random()*10;
	m.rotation.z = Math.random()*Math.PI*2;
	m.rotation.y = Math.random()*Math.PI*2;

	// set size of asteroid randomly
	var scalingFactor = 0.1 + Math.random() * 0.9;
	m.scale.set(scalingFactor, scalingFactor, scalingFactor);

	// allow each asteroid to cast and receive shadows
	m.castShadow = true;
	m.receiveShadow = true;

	// add to 3D container we created above
	this.mesh.add(m);
}

Sky = function() {
	// create empty container
	this.mesh = new THREE.Object3D();

	// define # clouds in the sky
	this.nAsteroids = 10;

	// create uniform distr of clouds
	var stepAngle = Math.PI*2 / this.nAsteroids;

	// create the clouds
	for(var i=0; i < this.nAsteroids; i++) {
		var c = new Asteroid();

		// set rotation and position of each cloud with trig
		var a = stepAngle * i;

		// distance b/w center of axis and cloud
		var h = 800 + Math.random() * 200;

		// convert polar (angle, dist) coords to Cartesian (x,y)
		c.mesh.position.x = Math.cos(a) * h;
		c.mesh.position.y = Math.sin(a) * h;

		// rotate cloud according to position
		c.mesh.rotation.z = a + Math.PI/2;

		// position clouds at random depths in scene
		c.mesh.position.z = -400 - Math.random()*400;

		// randomly scale each cloud
		var scalingFactor = 1 + Math.random()*2;
		c.mesh.scale.set(scalingFactor, scalingFactor, scalingFactor);

		// add mesh of cloud in scene
		this.mesh.add(c.mesh);
	}
}

var sky;

function createSky() {
	sky = new Sky();
	sky.mesh.position.y = -600;
	scene.add(sky.mesh);
}


var Airplane = function() {
	this.mesh = new THREE.Object3D();

	// cockpit
	var geomCockpit = new THREE.BoxGeometry(60, 50, 50, 1, 1, 1);
	var matCockpit = new THREE.MeshPhongMaterial({color: Colors.red, shading: THREE.FlatShading});
	
	// hardcoded manipulation of vertices
	geomCockpit.vertices[4].y -= 10;
	geomCockpit.vertices[4].z += 20;
	geomCockpit.vertices[5].y-=10;
	geomCockpit.vertices[5].z-=20;
	geomCockpit.vertices[6].y+=30;
	geomCockpit.vertices[6].z+=20;
	geomCockpit.vertices[7].y+=30;
	geomCockpit.vertices[7].z-=20;

	var cockpit = new THREE.Mesh(geomCockpit, matCockpit);
	cockpit.castShadow = true;
	cockpit.receiveShadow = true;
	this.mesh.add(cockpit);

	// engine
	var geomEngine = new THREE.BoxGeometry(20, 50, 50, 1, 1, 1);
	var matEngine = new THREE.MeshPhongMaterial({color: Colors.white, shading: THREE.FlatShading});
	var engine = new THREE.Mesh(geomEngine, matEngine);
	engine.position.x = 40;
	engine.castShadow = true;
	engine.receiveShadow = true;
	this.mesh.add(engine);

	// tail 
	var geomTail = new THREE.BoxGeometry(15, 20, 5, 1, 1, 1);
	var matTail = new THREE.MeshPhongMaterial({color: Colors.red, shading: THREE.FlatShading});
	var tail = new THREE.Mesh(geomTail, matTail);
	tail.position.set(-35, 25, 0);
	tail.castShadow = true;
	tail.receiveShadow = true;
	this.mesh.add(tail);

	// side wing
	var geomSideWing = new THREE.BoxGeometry(40, 8, 150, 1, 1, 1);
	var matSideWing = new THREE.MeshPhongMaterial({color: Colors.red, shading: THREE.FlatShading});
	var sideWing = new THREE.Mesh(geomSideWing, matSideWing);
	sideWing.castShadow = true;
	sideWing.receiveShadow = true;
	this.mesh.add(sideWing);

	// propeller
	var geomPropeller = new THREE.BoxGeometry(20, 10, 10, 1, 1, 1);
	var matPropeller = new THREE.MeshPhongMaterial({color: Colors.brown, shading: THREE.FlatShading});
	// TODO why don't we add this to the mesh?
	// 		why does it get its own this variable???
	// 		because we add blades to the propeller BEFORE adding to overall mesh 
	this.propeller = new THREE.Mesh(geomPropeller, matPropeller);
	this.propeller.castShadow = true;
	this.propeller.receiveShadow = true;

	// blades
	var geomBlade = new THREE.BoxGeometry(1, 100, 20, 1, 1, 1);
	var matBlade = new THREE.MeshPhongMaterial({color: Colors.brownDark, shading: THREE.FlatShading});
	var blade = new THREE.Mesh(geomBlade, matBlade);
	blade.position.set(8, 0, 0);
	blade.castShadow = true;
	blade.receiveShadow = true;
	this.propeller.add(blade);
	this.propeller.position.set(50, 0, 0);
	this.mesh.add(this.propeller);

	this.pilot = new Pilot();
	this.pilot.mesh.position.set(-10, 27, 0);
	this.mesh.add(this.pilot.mesh);

	this.mesh.castShadow = true;
	this.mesh.receiveShadow = true;
}

var airplane;

function createPlane() {
	airplane = new Airplane();
	airplane.mesh.scale.set(0.25, 0.25, 0.25);
	airplane.mesh.position.y = 100;
	scene.add(airplane.mesh);
}

// mammoth pilot function that is actual just 
// 	putting a bunch of primitives together
var Pilot = function() {
	this.mesh = new THREE.Object3D();
	this.mesh.name = "pilot";

	// introduce property to animate hair later
	this.angleHairs = 0;

	// body of pilot
	var geomBody = new THREE.BoxGeometry(15, 15, 15);
	var matBody = new THREE.MeshPhongMaterial({color: Colors.brown, shading: THREE.FlatShading});
	var body = new THREE.Mesh(geomBody, matBody);
	// TODO play around and see how it affects positioning
	body.position.set(2, -12, 0);
	this.mesh.add(body);

	// face 
	var geomFace = new THREE.CircleGeometry(5, 32);
	var matFace = new THREE.MeshLambertMaterial({color: Colors.pink});
	var face = new THREE.Mesh(geomFace, matFace);
	this.mesh.add(face);

	// hair
	var geomHair = new THREE.BoxGeometry(4, 4, 4);
	var matHair = new THREE.MeshLambertMaterial({color: Colors.black});
	var hair = new THREE.Mesh(geomHair, matHair);
	// align shape of hair to bottom boundary for easier scalability
	hair.geometry.applyMatrix(new THREE.Matrix4().makeTranslation(0,2,0));

	// create container for top hairs
	var hairs = new THREE.Object3D();

	this.topHairs = new THREE.Object3D();
	for(var i=0; i<15; i++) {
		var h = hair.clone();
		var col = i%3;
		var row = Math.floor(i/3);
		var startPosZ = -4;
		var startPosX = -20;
		h.position.set(startPosX + row*4, 0, startPosZ + col*4);
		this.topHairs.add(h);
	}

	hairs.add(this.topHairs);

	// create sideHairs
	var geomSideHair = new THREE.BoxGeometry(12, 4, 2);
	geomSideHair.applyMatrix(new THREE.Matrix4().makeTranslation(-6, 0, 0));
	var hairSideR = new THREE.Mesh(geomSideHair, matHair);
	var hairSideL = hairSideR.clone();
	hairSideR.position.set(8, -2, 6);
	hairSideL.position.set(8, -2, -6); 
	hairs.add(hairSideL);
	hairs.add(hairSideR);

	// create hairs at back of head
	var geomBackHair = new THREE.BoxGeometry(2, 8, 10);
	var backHair = new THREE.Mesh(geomBackHair, matHair);
	backHair.position.set(-1, -4, 0);
	hairs.add(backHair);
	hairs.position.set(-5, 5, 0);
	this.mesh.add(hairs);

	// TODO add scarf

	// glasses
	var geomGlass = new THREE.BoxGeometry(2, 5, 5);
	var matGlass = new THREE.MeshLambertMaterial({color: Colors.red});
	var glassR = new THREE.Mesh(geomGlass, matGlass);
	glassR.position.set(6, 0, 3);
	var glassL = glassR.clone();
	glassL.position.z = -glassR.position.z;

	var geomGlassA = new THREE.BoxGeometry(11, 1, 11);
	var glassA = new THREE.Mesh(geomGlassA, matGlass);
	this.mesh.add(glassR);
	this.mesh.add(glassL);
	this.mesh.add(glassA);

	var geomEar = new THREE.BoxGeometry(2, 3, 2);
	var earL = new THREE.Mesh(geomEar, matFace);
	earL.position.set(0, 0, -6);
	var earR = earL.clone();
	earR.position.z = -earL.position.z;
	this.mesh.add(earL);
	this.mesh.add(earR);
}

Pilot.prototype.updateHairs = function() {
	// get hair
	var hairs = this.topHairs.children;

	// update based on angleHairs
	var len = hairs.length;
	for (var i=0; i<len; i++) {
		var h = hairs[i];
		// scale each hair elt on cyclical basis
		// apply cyclical movement to each vertex
		h.scale.y = 0.75 + Math.cos(this.angleHairs + i/3) * 0.25;
	}

	// increment angleHair for next frame
	this.angleHairs += 0.16;
}


/*
USER INTERACTION
*/
var mousePos = {x:0, y:0};

function handleMouseMove(event) {
	// convert mouse position to ndc (normalized device coords) in [-1, 1]
	var tx = -1 + (event.clientX / WIDTH) * 2;

	// remember to flip 2D y-axis b/c it goes opp dir of 3D y-axis
	var ty = 1 - (event.clientY / HEIGHT) * 2;

	mousePos = {x: tx, y: ty};
}

/*
RENDERING AND ANIMATION
*/
function loop() {
	// rotate propeller, planet, and sky
	airplane.propeller.rotation.x += 0.8;
	planet.mesh.rotation.z += 0.005;
	sky.mesh.rotation.z += 0.01;

	// rotate waves
	planet.moveWaves();

	// update plane on each frame
	updatePlane();

	// animate hair
	// TODO how did we actually make it so that airplane recognizes pilot?
	airplane.pilot.updateHairs();

	// render scene
	renderer.render(scene, camera);

	// call loop function again, i.e. ready to update animation (60x/sec)
	requestAnimationFrame(loop);
}


function updatePlane() {
	// move plane b/w -100 and 100 on horiz axis
	// 	and b/w 25 and 175 on vert axis, depending 
	// 	on the ndc of the mouse position
	var targetX = normalize(mousePos.x, -1, 1,-100, 100);
	var targetY = normalize(mousePos.y, -1, 1, 25, 175);

	// remaining dist = dist b/w mouse and plane
	// move plane at each frame by adding fraction of remaining distance
	airplane.mesh.position.y += (targetY-airplane.mesh.position.y)*0.1;

	// rotate plane proportionally to remaining distance
	// fast? move CCW. slow? move CW
	airplane.mesh.rotation.z = (targetY-airplane.mesh.position.y)*0.0128;
	airplane.mesh.rotation.x = (airplane.mesh.position.y-targetY)*0.0064;

	airplane.propeller.rotation.x += 0.3; 
}


function normalize(v, vmin, vmax, tmin, tmax) {
	// thought you'd get away without math, eh? shame on you!
	var nv = Math.max(Math.min(v, vmax), vmin);
	var dv = vmax - vmin;
	var pc = (nv - vmin)/dv;
	var dt = tmax - tmin;
	var tv = tmin + (pc*dt);
	return tv;
}



