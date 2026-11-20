# ADR-0002: Physics engine for the landing's 3D rooms

- Status: accepted
- Date: 2026-11-13
- Decided by: Alejandro (owner), with the web squad ingeniero

## Context

The owner asked for real gravity in the landing's 3D rooms (issue #6). The props fall, tip and roll. The cat shoves them. A tap knocks them. The hanging lamp swings when the pointer passes. The letters of the hero's motto give under the cat's paws and spring back.

ADR-0001 lists Three.js and GSAP for the 3D layer and no physics engine, so the engine is a new dependency.

Two engines were measured, installed in this repo:

| Engine | Added to the page, gzip | Maintenance |
|---|---|---|
| `@dimforge/rapier3d-compat` 0.21.0 | 1.65 MB (WebAssembly embedded in the JS) | Active |
| `cannon-es` 0.20.0 | 36 KB | No release since 2022 |

## Decision

- The landing uses Rapier, through `@dimforge/rapier3d-compat`. The owner chose it over the lighter cannon-es for its upkeep and its stable stacking.
- Rapier loads in its own chunk, after the stage is up (`loadRapier` in `src/landing/stage/physics.ts`). The first paint and the 3D models never wait for it. Until it is in, the props stand where the rooms put them. If it fails, they stay there and the stage goes on.
- Each room is its own world, in the metres of its content frame. Gravity is 9.81 m/s² straight down that frame: the rooms lean back for the camera, not for gravity.
- What holds is fixed: the planks, and the wall they hang on. The props are dynamic bodies that start asleep, exactly where the room placed them. The cat is a kinematic body that the stage moves. The hanging lamp hangs on a ball joint under a point that follows the top of its cord. The motto's letters are DOM text driven by springy bodies.
- A prop that falls off the screen, or that lies off the shelves for a few seconds, grows back in its place.

## Consequences

- The landing downloads about 1.65 MB more, after the first paint.
- Colliders are hand-measured from `blender/props/build.py` (`SHAPES` in `src/landing/stage/props.ts`). A prop whose mesh changes needs its colliders checked.
