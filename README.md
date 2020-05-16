M4ZE.js
=======

M4ZE.js is a 4-dimensional maze game, written in TypeScript and WebGL. Your viewpoint is a 2D projection of a 3D hyperplane sliced through the complete 4D maze. Rotations in 4D space can change the angle of the hyperplane through which you are viewing the environment, permitting full 4D navigation. A new random maze is generated every time the game is restarted.

Running It
----------

To build the project, clone the repository and run `npm install && npm run build`.

The game can then be run with `npm start`; or, if you install `electron` globally (`npm i -g electron`), it can be run manually with `electron .` in the repository root directory.

Objective
---------

Follow the path of blue grid cells to the end of the maze (marked in yellow). When you reach the end, the blue path markers will reset, but more sparsely--one marker every two cells for your second run, every three cells for your third run, and so on. See how well you can learn the maze, and how many times you can make it back and forth between beginning and end points, before you get hopelessly lost.

Controls
--------

**Mouse and Reticle**

The green reticle indicates the distance to the wall it's pointing at. Normally, it sits in the center of the screen, but holding down the mouse button will move the reticle to wherever you are pointing, and rotate and accelerate you in that direction.

**Keyboard**

Spacebar moves you forward. SHIFT+Spacebar moves you backwards.

Controls for basic 3D rotations are replicated in four places:

QWE/ASD, UIO/JKL, and 789/456 (on the numeric keypad, if you have one) handle pitch, roll, and yaw. The arrow keys handle pitch and yaw. You can pick whichever set of keys is most comfortable for you to use.

4D rotations are activated by the ZXC or ,./ keys (one set on either side of the keyboard, so you can pick which hand to use). These work by swapping one axis from each 3D rotation plane with the player-entered W-axis. Normally, pith, yaw, and roll rotations occur in the ZY, ZX, and YX planes, respectively. Pressing the Z (or ,) key remaps pitch to the ZW plane, yaw to the XW plane, and roll to the YW plane; pressing the X (or .) key remaps pitch to the XW plane, yaw to the YW plane, and roll to the ZW plane; and pressing the C (or /) key remaps pitch to the YW plane, yaw to the ZW plane, and roll to the XW plane. (The Y key might make more semantic sense for that function than the C key, but they C key is right next to X and Z on the keyboard, while Y is not.)

Pressing M will mark the grid cell you are currently in in red, which you can use to mark your location in order to find your way back if you need to go exploring.

The + and - keys change the camera lens plane, widening or narrowing your angle of view.

Future Plans
------------

Future versions are intended to include "fuel limits" to incentivize efficient maze solving, and provide an actual end-game condition (since it currently only ends when you get bored with it), along with extra "fuel depot" cells to incentivize exploration off the main path.