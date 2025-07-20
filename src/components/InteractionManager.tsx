import * as THREE from 'three';
import { MutableRefObject } from 'react';
import { ShapeManager } from './ShapeManager';

// Interface for animation data
interface AnimationData {
  originalScale: THREE.Vector3;
  originalPosition: THREE.Vector3;
  originalRotation: THREE.Euler;
  originalColor?: THREE.Color;
  animationStartTime: number;
  isAnimating: boolean;
  isHovered: boolean;
}

// Interface for GSAP timeline
interface GSAPTimeline {
  to: (target: unknown, vars: unknown, position?: number | string) => GSAPTimeline;
}

// Interface for GSAP
interface GSAP {
  timeline: () => GSAPTimeline;
  to: (target: unknown, vars: unknown) => unknown;
}

// Audio for shape interaction
const particleAudio = typeof window !== 'undefined' ? new Audio('/particle-movement.wav') : null;
function playParticleAudio() {
  if (particleAudio) {
    particleAudio.currentTime = 0;
    particleAudio.play();
  }
}

export class InteractionManager {
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private cameraRef: MutableRefObject<THREE.PerspectiveCamera | null>;
  private sceneRef: MutableRefObject<THREE.Scene | null>;
  private cardsGroupRef: MutableRefObject<THREE.Group | null>;
  private textGroupRef: MutableRefObject<THREE.Group | null>;
  private dotsGroupRef: MutableRefObject<THREE.Group | null>;
  
  // Animation state
  private animatedObjects: Map<THREE.Object3D, AnimationData> = new Map();

  // Track currently hovered and moving object
  private currentlyHoveredObject: THREE.Object3D | null = null;
  private movingObject: THREE.Object3D | null = null;

  // Add a ShapeManager instance for breaking effect
  private shapeManager: ShapeManager | null = null;
  // Track broken cube state
  private brokenCubeMap: Map<THREE.Object3D, THREE.Group> = new Map();

  private onAgentClick?: (agentIndex: number, position: THREE.Vector3) => void;
  private onSplineClick?: (sceneUrl: string) => void;

  constructor(
    cameraRef: MutableRefObject<THREE.PerspectiveCamera | null>,
    sceneRef: MutableRefObject<THREE.Scene | null>,
    cardsGroupRef: MutableRefObject<THREE.Group | null>,
    textGroupRef: MutableRefObject<THREE.Group | null>,
    dotsGroupRef: MutableRefObject<THREE.Group | null>,
    onAgentClick?: (agentIndex: number, position: THREE.Vector3) => void,
    onSplineClick?: (sceneUrl: string) => void
  ) {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.cameraRef = cameraRef;
    this.sceneRef = sceneRef;
    this.cardsGroupRef = cardsGroupRef;
    this.textGroupRef = textGroupRef;
    this.dotsGroupRef = dotsGroupRef;
    this.shapeManager = new ShapeManager(cameraRef);
    this.onAgentClick = onAgentClick;
    this.onSplineClick = onSplineClick;
  }

  // Handle mouse move events for hover detection and real-time movement
  public handlePointerMove = (event: PointerEvent): void => {
    this.updateMousePosition(event);
    this.raycastAndHandleHover();
    this.moveObjectWithCursor(event);
  };

  // Handle touch move events for mobile hover simulation
  public handleTouchMove = (event: TouchEvent): void => {
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      this.updateMousePositionFromTouch(touch);
      this.raycastAndHandleHover();
    }
  };

  // Update mouse position from pointer event
  private updateMousePosition(event: PointerEvent): void {
    const target = event.currentTarget as HTMLElement;
    if (!target) return;
    
    const rect = target.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  // Update mouse position from touch event
  private updateMousePositionFromTouch(touch: Touch): void {
    const target = touch.target as HTMLElement;
    if (!target) return;
    
    const rect = target.getBoundingClientRect();
    this.mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
  }

  // Perform raycasting and handle hover animations
  private raycastAndHandleHover(): void {
    if (!this.cameraRef.current || !this.sceneRef.current) return;

    this.raycaster.setFromCamera(this.mouse, this.cameraRef.current);

    // Collect all interactive objects
    const interactiveObjects: THREE.Object3D[] = [];
    
    if (this.cardsGroupRef.current) {
      this.cardsGroupRef.current.children.forEach(child => {
        if (child.userData?.isClickable) {
          interactiveObjects.push(child);
        }
      });
    }
    
    if (this.textGroupRef.current) {
      this.textGroupRef.current.children.forEach(child => {
        if (child.userData?.isClickable) {
          interactiveObjects.push(child);
        }
      });
    }
    
    if (this.dotsGroupRef.current) {
      this.dotsGroupRef.current.children.forEach(child => {
        if (child.userData?.isClickable) {
          interactiveObjects.push(child);
        }
      });
    }

    const intersects = this.raycaster.intersectObjects(interactiveObjects, true);

    if (intersects.length > 0) {
      const intersectedObject = intersects[0].object;
      
      // Change cursor to pointer when hovering over interactive objects
      document.body.style.cursor = 'pointer';
      
      // If we're hovering over a new object
      if (this.currentlyHoveredObject !== intersectedObject) {
        // Stop hover animation on previous object
        if (this.currentlyHoveredObject) {
          this.stopHoverAnimation(this.currentlyHoveredObject);
        }
        
        // Start hover animation on new object
        this.startHoverAnimation(intersectedObject);
        this.currentlyHoveredObject = intersectedObject;
      }
    } else {
      // No object is being hovered - reset cursor
      document.body.style.cursor = 'default';
      
      // Stop hover animation on previous object
      if (this.currentlyHoveredObject) {
        this.stopHoverAnimation(this.currentlyHoveredObject);
        this.currentlyHoveredObject = null;
      }
    }
  }

  // Start hover animation on an object
  private startHoverAnimation(object: THREE.Object3D): void {
    const now = Date.now();
    
    // Store original properties if not already stored
    if (!this.animatedObjects.has(object)) {
      this.animatedObjects.set(object, {
        originalScale: object.scale.clone(),
        originalPosition: object.position.clone(),
        originalRotation: object.rotation.clone(),
        animationStartTime: now,
        isAnimating: true,
        isHovered: true
      });
    }

    // Trigger different hover animations based on object type
    const userData = object.userData;
    
    if (userData.shapeType) {
      if (userData.shapeType === 'dot') {
        this.startDotHoverAnimation(object);
      } else if (userData.shapeType.includes('milestone_text')) {
        this.startMilestoneTextHoverAnimation(object);
      } else if (userData.shapeType === 'ai_agent') {
        this.startAgentBoxHoverAnimation(object);
      } else {
        this.startShapeHoverAnimation(object, userData.shapeType);
      }
    } else {
      this.startGenericObjectHoverAnimation(object);
    }
  }

  // Stop hover animation on an object
  private stopHoverAnimation(object: THREE.Object3D): void {
    // Restore broken cube if needed
    if (this.brokenCubeMap.has(object) && this.cardsGroupRef.current) {
      const piecesGroup = this.brokenCubeMap.get(object)!;
      this.cardsGroupRef.current.remove(piecesGroup);
      this.cardsGroupRef.current.add(object);
      this.brokenCubeMap.delete(object);
    }

    const data: AnimationData = this.animatedObjects.get(object)!;
    if (!data) return;

    data.isHovered = false;

    // Return object to original state
    const gsap = (window as unknown as { gsap?: GSAP }).gsap;
    if (!gsap) return;
    
    gsap.to(object.scale, {
      x: data.originalScale.x,
      y: data.originalScale.y,
      z: data.originalScale.z,
      duration: 0.3,
      ease: "power2.out"
    });

    gsap.to(object.position, {
      x: data.originalPosition.x,
      y: data.originalPosition.y,
      z: data.originalPosition.z,
      duration: 0.3,
      ease: "power2.out"
    });

    // Return color to original if it was changed
    if (data.originalColor) {
      const mesh = object as THREE.Mesh;
      if (mesh.material && 'color' in mesh.material && mesh.material.color) {
         const color = mesh.material.color as THREE.Color;
         gsap.to(color, {
           r: data.originalColor.r,
           g: data.originalColor.g,
           b: data.originalColor.b,
           duration: 0.3,
           ease: "power2.out"
         });
      }
    }
  }

  // Start dot hover animation
  private startDotHoverAnimation(object: THREE.Object3D): void {
    playParticleAudio();
    const gsap = (window as unknown as { gsap?: GSAP }).gsap;
    if (!gsap) return;

    const data: AnimationData = this.animatedObjects.get(object)!;
    
    // Different animations based on dot position
    const columnIndex = data.originalPosition.x || 0;
    
    if (columnIndex % 2 === 0) {
      // Even columns: Scale and glow
      gsap.to(object.scale, {
        x: data.originalScale.x * 2,
        y: data.originalScale.y * 2,
        z: data.originalScale.z * 2,
        duration: 0.3,
        ease: "elastic.out(1, 0.5)"
      });
    } else {
      // Odd columns: Move to side and rotate
      const direction = columnIndex % 4 === 1 ? 1 : -1;
      gsap.to(object.position, {
        x: data.originalPosition.x + (direction * 3),
        duration: 0.4,
        ease: "back.out(1.7)"
      });
      
      gsap.to(object.rotation, {
        z: data.originalRotation.z + (Math.PI * 2),
        duration: 0.6,
        ease: "power2.inOut"
      });
    }

    // Add color glow effect
    const mesh = object as THREE.Mesh;
    if (mesh.material && 'color' in mesh.material && mesh.material.color) {
      const color = mesh.material.color as THREE.Color;
      const originalColor = color.clone();
      data.originalColor = originalColor;
      
      gsap.to(color, {
        r: Math.min(1, originalColor.r * 2),
        g: Math.min(1, originalColor.g * 2),
        b: Math.min(1, originalColor.b * 2),
        duration: 0.3,
        ease: "power2.out"
      });
    }
  }

  // Start shape hover animation with diverse effects
  private startShapeHoverAnimation(object: THREE.Object3D, shapeType: string): void {
    playParticleAudio();
    if ((shapeType === 'cube' || shapeType === 'breakable_cube') && this.shapeManager && this.cardsGroupRef.current) {
      // Only break if not already broken
      if (!this.brokenCubeMap.has(object)) {
        // Remove original cube
        this.cardsGroupRef.current.remove(object);
        // Create pieces
        const piecesGroup = this.shapeManager.createBrokenCubePieces(object as THREE.Mesh);
        this.cardsGroupRef.current.add(piecesGroup);
        this.brokenCubeMap.set(object, piecesGroup);
        // Animate pieces outward (no pre-break movement)
        const gsap = (window as unknown as { gsap?: GSAP }).gsap;
        if (gsap) {
          piecesGroup.children.forEach((piece, i) => {
            const dir = new THREE.Vector3(
              (Math.random() - 0.5) * 2,
              (Math.random() - 0.5) * 2,
              (Math.random() - 0.5) * 2
            ).normalize();
            const distance = 3 + Math.random() * 2;
            gsap.to(piece.position, {
              x: piece.position.x + dir.x * distance,
              y: piece.position.y + dir.y * distance,
              z: piece.position.z + dir.z * distance,
              duration: 0.7,
              ease: 'power2.out',
              delay: i * 0.03
            });
            gsap.to(piece.rotation, {
              x: piece.rotation.x + Math.random() * Math.PI,
              y: piece.rotation.y + Math.random() * Math.PI,
              z: piece.rotation.z + Math.random() * Math.PI,
              duration: 0.7,
              ease: 'power2.out',
              delay: i * 0.03
            });
          });
        }
      }
      return;
    }

    const gsap = (window as unknown as { gsap?: GSAP }).gsap;
    if (!gsap) return;

    // Trigger different animations based on shape type and position
    switch (shapeType) {
      case 'sphere':
        this.animateSphereHover(object);
        break;
      case 'cylinder':
        this.animateCylinderHover(object);
        break;
      case 'cone':
        this.animateConeHover(object);
        break;
      case 'torus':
        this.animateTorusHover(object);
        break;
      case 'octahedron':
        this.animateOctahedronHover(object);
        break;
      case 'tetrahedron':
        this.animateTetrahedronHover(object);
        break;
      case 'dodecahedron':
        this.animateDodecahedronHover(object);
        break;
      default:
        this.animateGenericShapeHover(object);
    }
  }

  // Sphere hover animation - Bounce and roll
  private animateSphereHover(object: THREE.Object3D): void {
    const gsap = (window as unknown as { gsap?: GSAP }).gsap;
    if (!gsap) return;
    
    const timeline = gsap.timeline();
    
    // Bounce up
    timeline.to(object.position, {
      y: object.position.y + 3,
      duration: 0.4,
      ease: "bounce.out"
    });
    
    // Roll to side
    const direction = 0;
    if (direction !== 0) {
      timeline.to(object.position, {
        x: object.position.x + (direction * 4),
        duration: 0.5,
        ease: "power2.inOut"
      }, 0.2);
    }
    
    // Scale and rotate
    timeline.to(object.scale, {
      x: object.scale.x * 1.3,
      y: object.scale.y * 1.3,
      z: object.scale.z * 1.3,
      duration: 0.3,
      ease: "elastic.out(1, 0.3)"
    }, 0);
    
    timeline.to(object.rotation, {
      x: object.rotation.x + (Math.PI * 2),
      y: object.rotation.y + (Math.PI * 2),
      duration: 0.8,
      ease: "power2.inOut"
    }, 0);
  }

  // Cylinder hover animation - Spin and stretch
  private animateCylinderHover(object: THREE.Object3D): void {
    const gsap = (window as unknown as { gsap?: GSAP }).gsap;
    if (!gsap) return;
    
    const timeline = gsap.timeline();
    
    // Stretch vertically
    timeline.to(object.scale, {
      x: object.scale.x * 1.1,
      y: object.scale.y * 1.8,
      z: object.scale.z * 1.1,
      duration: 0.4,
      ease: "power2.out"
    });
    
    // Spin rapidly
    timeline.to(object.rotation, {
      z: object.rotation.z + (Math.PI * 6),
      duration: 1.2,
      ease: "power2.inOut"
    }, 0);
    
    // Move in circular pattern
    const angle = 0;
    timeline.to(object.position, {
      x: object.position.x + Math.cos(angle) * 3,
      z: object.position.z + Math.sin(angle) * 3,
      duration: 0.6,
      ease: "power2.inOut"
    }, 0.2);
  }

  // Cone hover animation - Flip and fly
  private animateConeHover(object: THREE.Object3D): void {
    const gsap = (window as unknown as { gsap?: GSAP }).gsap;
    if (!gsap) return;
    
    const timeline = gsap.timeline();
    
    // Flip upside down
    timeline.to(object.rotation, {
      x: object.rotation.x + Math.PI,
      duration: 0.5,
      ease: "power2.inOut"
    });
    
    // Fly up and to side
    const direction = 0;
    timeline.to(object.position, {
      y: object.position.y + 4,
      x: object.position.x + (direction * 5),
      duration: 0.6,
      ease: "back.out(1.7)"
    }, 0.2);
    
    // Scale up
    timeline.to(object.scale, {
      x: object.scale.x * 1.4,
      y: object.scale.y * 1.4,
      z: object.scale.z * 1.4,
      duration: 0.4,
      ease: "elastic.out(1, 0.5)"
    }, 0);
  }

  // Torus hover animation - Spiral and expand
  private animateTorusHover(object: THREE.Object3D): void {
    const gsap = (window as unknown as { gsap?: GSAP }).gsap;
    if (!gsap) return;
    
    const timeline = gsap.timeline();
    
    // Expand and rotate
    timeline.to(object.scale, {
      x: object.scale.x * 1.5,
      y: object.scale.y * 1.5,
      z: object.scale.z * 1.5,
      duration: 0.4,
      ease: "power2.out"
    });
    
    // Complex rotation
    timeline.to(object.rotation, {
      x: object.rotation.x + (Math.PI * 2),
      y: object.rotation.y + (Math.PI * 2),
      z: object.rotation.z + (Math.PI * 2),
      duration: 1.5,
      ease: "power2.inOut"
    }, 0);
    
    // Spiral movement
    const spiralRadius = 3;
    timeline.to(object.position, {
      x: object.position.x + Math.cos(0 * 0.1) * spiralRadius,
      y: object.position.y + Math.sin(0 * 0.1) * 2,
      z: object.position.z + Math.sin(0 * 0.1) * spiralRadius,
      duration: 0.8,
      ease: "power2.inOut"
    }, 0.3);
  }

  // Octahedron hover animation - Explode effect
  private animateOctahedronHover(object: THREE.Object3D): void {
    const gsap = (window as unknown as { gsap?: GSAP }).gsap;
    if (!gsap) return;
    
    const timeline = gsap.timeline();
    
    // Scale up dramatically
    timeline.to(object.scale, {
      x: object.scale.x * 2,
      y: object.scale.y * 2,
      z: object.scale.z * 2,
      duration: 0.3,
      ease: "power2.out"
    });
    
    // Explode outward
    const angle = 0;
    const distance = 6;
    timeline.to(object.position, {
      x: object.position.x + Math.cos(angle) * distance,
      y: object.position.y + Math.sin(angle) * distance,
      duration: 0.5,
      ease: "back.out(1.7)"
    }, 0.2);
    
    // Rapid rotation
    timeline.to(object.rotation, {
      x: object.rotation.x + (Math.PI * 4),
      y: object.rotation.y + (Math.PI * 4),
      z: object.rotation.z + (Math.PI * 4),
      duration: 0.8,
      ease: "power2.inOut"
    }, 0);
  }

  // Tetrahedron hover animation - Tumble and bounce
  private animateTetrahedronHover(object: THREE.Object3D): void {
    const gsap = (window as unknown as { gsap?: GSAP }).gsap;
    if (!gsap) return;
    
    const timeline = gsap.timeline();
    
    // Tumble rotation
    timeline.to(object.rotation, {
      x: object.rotation.x + (Math.PI * 3),
      y: object.rotation.y + (Math.PI * 3),
      z: object.rotation.z + (Math.PI * 3),
      duration: 1.2,
      ease: "power2.inOut"
    });
    
    // Bounce pattern
    const bounceHeight = 3;
    timeline.to(object.position, {
      y: object.position.y + bounceHeight,
      duration: 0.4,
      ease: "bounce.out"
    })
    .to(object.position, {
      y: object.position.y + (bounceHeight * 0.5),
      duration: 0.3,
      ease: "bounce.out"
    })
    .to(object.position, {
      y: object.position.y,
      duration: 0.2,
      ease: "bounce.out"
    });
    
    // Scale pulse
    timeline.to(object.scale, {
      x: object.scale.x * 1.6,
      y: object.scale.y * 1.6,
      z: object.scale.z * 1.6,
      duration: 0.3,
      ease: "power2.out"
    }, 0)
    .to(object.scale, {
      x: object.scale.x,
      y: object.scale.y,
      z: object.scale.z,
      duration: 0.3,
      ease: "power2.inOut"
    }, 0.6);
  }

  // Dodecahedron hover animation - Morph and float
  private animateDodecahedronHover(object: THREE.Object3D): void {
    const gsap = (window as unknown as { gsap?: GSAP }).gsap;
    if (!gsap) return;
    
    const timeline = gsap.timeline();
    
    // Float up with gentle oscillation
    timeline.to(object.position, {
      y: object.position.y + 2,
      duration: 0.6,
      ease: "power2.out"
    });
    
    // Gentle rotation
    timeline.to(object.rotation, {
      x: object.rotation.x + (Math.PI * 0.5),
      y: object.rotation.y + (Math.PI * 0.5),
      duration: 0.8,
      ease: "power2.inOut"
    }, 0);
    
    // Scale with morphing effect
    timeline.to(object.scale, {
      x: object.scale.x * 1.3,
      y: object.scale.y * 1.1,
      z: object.scale.z * 1.3,
      duration: 0.4,
      ease: "power2.out"
    }, 0)
    .to(object.scale, {
      x: object.scale.x * 1.1,
      y: object.scale.y * 1.3,
      z: object.scale.z * 1.1,
      duration: 0.4,
      ease: "power2.inOut"
    }, 0.4);
    
    // Sideways drift
    const direction = 0;
    timeline.to(object.position, {
      x: object.position.x + (direction * 2),
      duration: 0.8,
      ease: "power2.inOut"
    }, 0.3);
  }

  // Generic shape hover animation
  private animateGenericShapeHover(object: THREE.Object3D): void {
    playParticleAudio();
    const gsap = (window as unknown as { gsap?: GSAP }).gsap;
    if (!gsap) return;
    const timeline = gsap.timeline();
    // Smooth, predictable motion for all generic shapes
    timeline.to(object.scale, {
      x: object.scale.x * 1.25,
      y: object.scale.y * 1.25,
      z: object.scale.z * 1.25,
      duration: 0.4,
      ease: "elastic.out(1, 0.5)"
    });
    timeline.to(object.position, {
      y: object.position.y + 2.5,
      duration: 0.5,
      ease: "power2.out"
    }, 0);
    timeline.to(object.rotation, {
      y: object.rotation.y + Math.PI * 0.5,
      duration: 0.6,
      ease: "power2.inOut"
    }, 0);
  }

  // Start milestone text hover animation with unique effects
  private startMilestoneTextHoverAnimation(object: THREE.Object3D): void {
    const gsap = (window as unknown as { gsap?: GSAP }).gsap;
    if (!gsap) return;

    const data: AnimationData = this.animatedObjects.get(object)!;
    
    const timeline = gsap.timeline();
    
    // Different effects based on milestone number
    if (data.originalPosition.x % 3 === 0) {
      // Scale and glow
      timeline.to(object.scale, {
        x: 1.2,
        y: 1.2,
        z: 1.2,
        duration: 0.4,
        ease: "elastic.out(1, 0.5)"
      });
    } else if (data.originalPosition.x % 3 === 1) {
      // Float up and rotate
      timeline.to(object.position, {
        y: data.originalPosition.y + 1.5,
        duration: 0.5,
        ease: "power2.out"
      });
      timeline.to(object.rotation, {
        y: data.originalRotation.y + (Math.PI * 0.2),
        duration: 0.6,
        ease: "power2.inOut"
      }, 0);
    } else {
      // Pulse and move side
      const direction = data.originalPosition.x % 2 === 0 ? 1 : -1;
      timeline.to(object.position, {
        x: data.originalPosition.x + (direction * 2),
        duration: 0.4,
        ease: "back.out(1.7)"
      });
      timeline.to(object.scale, {
        x: 1.1,
        y: 1.1,
        z: 1.1,
        duration: 0.3,
        ease: "power2.out"
      }, 0);
    }
  }

  // Start agent box hover animation with dramatic effects
  private startAgentBoxHoverAnimation(object: THREE.Object3D): void {
    const gsap = (window as unknown as { gsap?: GSAP }).gsap;
    if (!gsap) return;

    const data: AnimationData = this.animatedObjects.get(object)!;
    
    const timeline = gsap.timeline();
    
    // Different effects based on agent index
    if (data.originalPosition.x % 4 === 0) {
      // Dramatic scale and rotation
      timeline.to(object.scale, {
        x: 1.3,
        y: 1.3,
        z: 1.3,
        duration: 0.4,
        ease: "back.out(1.7)"
      });
      timeline.to(object.rotation, {
        y: data.originalRotation.y + (Math.PI * 0.5),
        duration: 0.6,
        ease: "power2.inOut"
      }, 0);
    } else if (data.originalPosition.x % 4 === 1) {
      // Float and tilt
      timeline.to(object.position, {
        y: data.originalPosition.y + 2,
        duration: 0.5,
        ease: "power2.out"
      });
      timeline.to(object.rotation, {
        x: data.originalRotation.x + (Math.PI * 0.1),
        z: data.originalRotation.z + (Math.PI * 0.1),
        duration: 0.5,
        ease: "power2.inOut"
      }, 0);
    } else if (data.originalPosition.x % 4 === 2) {
      // Slide and scale
      const direction = data.originalPosition.x % 2 === 0 ? 1 : -1;
      timeline.to(object.position, {
        x: data.originalPosition.x + (direction * 4),
        duration: 0.5,
        ease: "power2.out"
      });
      timeline.to(object.scale, {
        x: 1.2,
        y: 1.2,
        z: 1.2,
        duration: 0.4,
        ease: "elastic.out(1, 0.5)"
      }, 0);
    } else {
      // Spin and bounce
      timeline.to(object.rotation, {
        y: data.originalRotation.y + (Math.PI * 2),
        duration: 0.8,
        ease: "power2.inOut"
      });
      timeline.to(object.position, {
        y: data.originalPosition.y + 1,
        duration: 0.3,
        ease: "bounce.out"
      }, 0.2);
    }
  }

  // Start generic object hover animation
  private startGenericObjectHoverAnimation(object: THREE.Object3D): void {
    playParticleAudio();
    const gsap = (window as unknown as { gsap?: GSAP }).gsap;
    if (!gsap) return;

    // const data: AnimationData = this.animatedObjects.get(object)!;
    
    const timeline = gsap.timeline();
    
    timeline.to(object.scale, { x: 1.3, y: 1.3, z: 1.3, duration: 0.3, ease: 'back.out(2)' });
  }

  // Move the hovered object with the cursor in real-time
  private moveObjectWithCursor(event: PointerEvent): void {
    if (!this.cameraRef.current || !this.sceneRef.current) return;
    if (!this.currentlyHoveredObject) return;

    // Project mouse position to 3D world
    const mouse = new THREE.Vector2();
    const target = event.currentTarget as HTMLElement;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Raycast from camera to mouse
    this.raycaster.setFromCamera(mouse, this.cameraRef.current);
    const planeZ = 0; // You may want to use object's current z or a specific plane
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -planeZ);
    const intersection = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(plane, intersection);

    // Move the object to the intersection point
    this.currentlyHoveredObject.position.x = intersection.x;
    this.currentlyHoveredObject.position.y = intersection.y;
    // Optionally keep z fixed or set to intersection.z
  }

  // Update animations
  public update(): void {
    const now = Date.now();
    
    // Clean up finished animations
    this.animatedObjects.forEach((data) => {
      if (data.isAnimating && now - data.animationStartTime > 2000) {
        data.isAnimating = false;
      }
    });
  }

  // Cleanup
  public dispose(): void {
    this.animatedObjects.clear();
    this.currentlyHoveredObject = null;
  }

  public handleClick = (event: MouseEvent, overlayGroup?: THREE.Group | null): void => {
    if (!this.cameraRef.current || !this.sceneRef.current) return;
    const domElement = (event.currentTarget as HTMLElement) || window;
    const rect = domElement.getBoundingClientRect ? domElement.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.cameraRef.current);

    // Collect all interactive objects
    const interactiveObjects: THREE.Object3D[] = [];
    if (this.cardsGroupRef.current) {
      this.cardsGroupRef.current.children.forEach(child => {
        if (child.userData?.isClickable) {
          interactiveObjects.push(child);
        }
        // Also check children of group (e.g., agent text mesh)
        if (child.children) {
          child.children.forEach(grandChild => {
            if (grandChild.userData?.isClickable) {
              interactiveObjects.push(grandChild);
            }
          });
        }
      });
    }
    if (this.textGroupRef.current) {
      this.textGroupRef.current.children.forEach(child => {
        if (child.userData?.isClickable) {
          interactiveObjects.push(child);
        }
      });
    }
    if (this.dotsGroupRef.current) {
      this.dotsGroupRef.current.children.forEach(child => {
        if (child.userData?.isClickable) {
          interactiveObjects.push(child);
        }
      });
    }
    // Add overlayGroup children if provided
    if (overlayGroup) {
      overlayGroup.children.forEach(child => {
        if (child.userData?.isClickable) {
          interactiveObjects.push(child);
        }
      });
    }
    const intersects = this.raycaster.intersectObjects(interactiveObjects, true);
    if (intersects.length > 0) {
      const mesh = intersects[0].object;
      if (
        (mesh.userData?.shapeType === 'ai_agent' || mesh.userData?.shapeType === 'ai_agent_text' || mesh.userData?.shapeType === 'agent_overlay') &&
        typeof mesh.userData.agentIndex === 'number'
      ) {
        if (this.onAgentClick) {
          this.onAgentClick(mesh.userData.agentIndex, mesh.position.clone());
        }
      } else if (mesh.userData?.shapeType === 'spline' && mesh.userData?.splineSceneUrl) {
        if (this.onSplineClick) {
          this.onSplineClick(mesh.userData.splineSceneUrl);
        }
      }
    }
  };
}