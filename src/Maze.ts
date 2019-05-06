import { Vec4 } from "./Vectors";

const F = 0, B = 1, L = 2, R = 3, U = 4, D = 5, A = 6, K = 7;
type Direction = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface Cell extends Vec4 {
  prev: Direction;
  back: Cell;
}

function rand(n: number) {
  return Math.floor(Math.random() * n);
}

function isSafe(grid: { val: number, id: number }[][][][], size: number, x: number, y: number, z: number, w: number) {
  const wg = grid[w];
  const zg = wg[z];
  const yg = zg[y];

   // make sure 8 of 9 cells are solid; 1024 = 128 * 8
  return 1024 === (
    yg[x].val +
    yg[(x+1)%size].val +
    yg[(x+size-1)%size].val +
    zg[(y+1)%size][x].val +
    zg[(y+size-1)%size][x].val +
    wg[(z+1)%size][y][x].val +
    wg[(z+size-1)%size][y][x].val +
    grid[(w+1)%size][z][y][x].val +
    grid[(w+size-1)%size][z][y][x].val
  );
}

function generate(start: Vec4, size: number): [ { val: number, id: number }[][][][], number ] {
  const grid: { val: number, id: number }[][][][] = [];

  console.log("Generating Grid");
  for (let w = 0; w < size; w++) {
    let zlevel = []
    for (let z = 0; z < size; z++) {
      let ylevel = [];
      for (let y = 0; y < size; y++) {
        let xlevel = [];
        for (let x = 0; x < size; x++) { xlevel.push({ val: 128, id: -1 }); }
        ylevel.push(xlevel);
      }
      zlevel.push(ylevel)
    }
    grid.push(zlevel);
  }
  
  console.log("Generating Maze");
  let { x: nx, y: ny, z: nz, w: nw } = start;
  const cells = [start];
  grid[nw][nz][ny][nx] = { val: 0, id: 0 };

  let nextId = 1;
  const safe: Direction[] = [];
  while (cells.length > 0) {
    //Grab a random empty cell
    const highest = cells.length - 1;
    const index = Math.random() < .5 ? rand(cells.length) : highest;
    ({ x: nx, y: ny, z: nz, w: nw } = cells[index]);
    
    //Check if there are any directions in which we can carve out a space
    //without running into another empty cell, which would create a cycle

    let slen = 0;
    if (isSafe(grid, size, (nx+1)%size, ny, nz, nw)) { safe[slen++] = R; }
    if (isSafe(grid, size, (nx+size-1)%size, ny, nz, nw)) { safe[slen++] = L; }
    
    if (isSafe(grid, size, nx, (ny+1)%size, nz, nw)) { safe[slen++] = U; }
    if (isSafe(grid, size, nx, (ny+size-1)%size, nz, nw)) { safe[slen++] = D; }
    
    if (isSafe(grid, size, nx, ny, (nz+1)%size, nw)) { safe[slen++] = F; }
    if (isSafe(grid, size, nx, ny, (nz+size-1)%size, nw)) { safe[slen++] = B; }
    
    if (isSafe(grid, size, nx, ny, nz, (nw+1)%size)) { safe[slen++] = A; }
    if (isSafe(grid, size, nx, ny, nz, (nw+size-1)%size)) { safe[slen++] = K; }
    
    if (slen === 0) {
      if (index < highest)
        cells[index] = cells[highest];
      cells.length--;
    } else {
      //Pick a random direction & carve it out
      switch (safe[rand(slen)]) {
      case R: nx = (nx + 1) % size;
        break;
      case L: nx = (nx - 1 + size) % size;
        break;
      case U: ny = (ny + 1) % size;
        break;
      case D: ny = (ny - 1 + size) % size;
        break;
      case F: nz = (nz + 1) % size;
        break;
      case B: nz = (nz - 1 + size) % size;
        break;
      case A: nw = (nw + 1) % size;
        break;
      case K: nw = (nw - 1 + size) % size;
        break;
      }

      grid[nw][nz][ny][nx] = { val: 0, id: nextId++ };
      cells.push({ x: nx, y: ny, z: nz, w: nw });
    }
  }
  
  console.log("Completed Maze");
  return [ grid, nextId ];
}

function find_farthest(grid: { val: number, id: number }[][][][], start: Cell, size: number) {
  let cells: Cell[] = [];
  let ncells = [start];
  do {
    cells.length = 0;
    [cells, ncells] = [ncells, cells];
    for (const cell of cells) {
      let {x, y, z, w} = cell;

      if (cell.prev !== R) {
        const n = (x+1)%size;
        if (grid[w][z][y][n].val !== 128)
          ncells.push({x:n,y,z,w,prev:L,back:cell});
      }

      if (cell.prev !== L) {
        const n = (x+size-1)%size;
        if (grid[w][z][y][n].val !== 128)
          ncells.push({x:n,y,z,w,prev:R,back:cell});
      }

      if (cell.prev !== U) {
        const n = (y+1)%size;
        if (grid[w][z][n][x].val !== 128)
          ncells.push({x,y:n,z,w,prev:D,back:cell});
      }
      
      if (cell.prev !== D) {
        const n = (y+size-1)%size;
        if (grid[w][z][n][x].val !== 128)
          ncells.push({x,y:n,z,w,prev:U,back:cell});
      }

      if (cell.prev !== F) {
        const n = (z+1)%size;
        if (grid[w][n][y][x].val !== 128)
          ncells.push({x,y,z:n,w,prev:B,back:cell});
      }
      
      if (cell.prev !== B) {
        const n = (z+size-1)%size;
        if (grid[w][n][y][x].val !== 128)
          ncells.push({x,y,z:n,w,prev:F,back:cell});
      }

      if (cell.prev !== A) {
        const n = (w+1)%size;
        if (grid[n][z][y][x].val !== 128)
          ncells.push({x,y,z,w:n,prev:K,back:cell});
      }
      
      if (cell.prev !== K) {
        const n = (w+size-1)%size;
        if (grid[n][z][y][x].val !== 128)
          ncells.push({x,y,z,w:n,prev:A,back:cell});
      }
    }
  } while(ncells.length > 0);

  return cells[0];
}

function distances(grid: { val: number, id: number }[][][][], size: number, start: Vec4, nodes: number) {
  const dists = new Int32Array(nodes);
  dists.fill(-1);

  let dist = 0;
  let level = [{ pos: start, data: grid[start.w][start.z][start.y][start.x] }];

  const nexts = ({ x, y, z, w }: Vec4) => {
    let data;
    const children = [];

    data = grid[(w+1)%size][z][y][x];
    if (dists[data.id] === -1) children.push({ pos: { x, y, z, w: (w+1)%size }, data});
    data = grid[(w+size-1)%size][z][y][x];
    if (dists[data.id] === -1) children.push({ pos: { x, y, z, w: (w+size-1)%size }, data});
    
    data = grid[w][(z+1)%size][y][x];
    if (dists[data.id] === -1) children.push({ pos: { x, y, z: (z+1)%size, w }, data});
    data = grid[w][(z+size-1)%size][y][x];
    if (dists[data.id] === -1) children.push({ pos: { x, y, z: (z+size-1)%size, w }, data});
    
    data = grid[w][z][(y+1)%size][x];
    if (dists[data.id] === -1) children.push({ pos: { x, y: (y+1)%size, z, w }, data});
    data = grid[w][z][(y+size-1)%size][x];
    if (dists[data.id] === -1) children.push({ pos: { x, y: (y+size-1)%size, z, w }, data});
    
    data = grid[w][z][y][(x+1)%size];
    if (dists[data.id] === -1) children.push({ pos: { x: (x+1)%size, y, z, w }, data});
    data = grid[w][z][y][(x+size-1)%size];
    if (dists[data.id] === -1) children.push({ pos: { x: (x+size-1)%size, y, z, w }, data});
    
    return children;
  }

  do {
    const nlevel = [];

    for (const cell of level) {
      dists[cell.data.id] = dist;
      nlevel.push(...nexts(cell.pos));
    }

    dist++;
    level = nlevel;
  } while (level.length);

  return dists;
}

interface Route {
  start: Vec4;
  end: Vec4;
  path: Vec4[];
  fromStart: Int32Array;
  fromEnd: Int32Array;
}

export default class Maze {
  private grid: { val: number, id: number }[][][][];
  private start: Vec4;
  public route: Route;

  constructor(public readonly size: number) {
    this.start = {
      x: rand(size),
      y: rand(size),
      z: rand(size),
      w: rand(size)
    };

    let nodes: number;
    [ this.grid, nodes ] = generate(this.start, size);
    
    const path = this.getLongestPath();
    const start = path.shift() as Vec4;
    const end = path.pop() as Vec4;

    this.route = {
      start, end, path,
      fromStart: distances(this.grid, size, start, nodes),
      fromEnd: distances(this.grid, size, end, nodes),
    };
  }

  get({ x, y, z, w }: Vec4) {
    return this.grid[w][z][y][x].val;
  }

  set({ x, y, z, w }: Vec4, val: number) {
    const c = this.grid[w][z][y][x];
    return  c.val = val;
  }

  getId({ x, y, z, w }: Vec4) {
    return this.grid[w][z][y][x].id;
  }

  cellIndex({ x, y, z, w }: Vec4) {
    const size = this.size;
    const size2 = size * size;
    const size3 = size2 * size;
    return 4 * (x * size3 + y * size2 + z * size + w);
  }

  private getLongestPath() {
    const path: Vec4[] = [];
    const { size, grid, start } = this;
    let farthest = find_farthest(grid, start as Cell, size);
    delete farthest.prev;
    delete farthest.back;
    farthest = find_farthest(grid, farthest, size);
    while (farthest) {
      path.push(farthest);
      farthest = farthest.back;
    }
    return path;
  }

  flatten() {
    const { size, grid } = this;
    const packed = new Uint8Array(4 * size * size * size * size);
    let i = 0;
    for (let x = 0; x < size; x++)
      for (let y = 0; y < size; y++)
        for (let z = 0; z < size; z++)
          for (let w = 0; w < size; w++) {
            packed[i] = grid[w][z][y][x].val;
            i += 4;
          }
    return packed;
  }
}
