function rand(n){
	return Math.floor(Math.random() * n);
}

function pick(list){
	return list[rand(list.length)];
};
	
function generate(start, xsize, ysize, zsize, wsize) {

	function isSafe(x, y, z, w){
		return 8 == (
			(grid[w][z][y][x] == 255 ? 1 : 0) +
			(grid[w][z][y][(x+1)%xsize] == 255 ? 1 : 0) +
			(grid[w][z][y][(x+xsize-1)%xsize] == 255 ? 1 : 0) +
			(grid[w][z][(y+1)%ysize][x] == 255 ? 1 : 0) +
			(grid[w][z][(y+ysize-1)%ysize][x] == 255 ? 1 : 0) +
			(grid[w][(z+1)%zsize][y][x] == 255 ? 1 : 0) +
			(grid[w][(z+zsize-1)%zsize][y][x] == 255 ? 1 : 0) +
			(grid[(w+1)%wsize][z][y][x] == 255 ? 1 : 0) +
			(grid[(w+wsize-1)%wsize][z][y][x] == 255 ? 1 : 0)
		);				
	}

	console.log("Generating Grid");
	const grid = [];
	for(let w = 0; w < wsize; w++){
		let zlevel = []
		for (let z = 0; z < zsize; z++){
			let ylevel = [];
			for (let y = 0; y < ysize; y++) {
				let xlevel = [];
				for (let x = 0; x < xsize; x++) { xlevel.push(255); }
				ylevel.push(xlevel);
			}
			zlevel.push(ylevel)
		}
		grid.push(zlevel);
	}
	
	console.log("Generating Maze");
	let { x: nx, y: ny, z: nz, w: nw } = start;
	const cells = [start];
	grid[nw][nz][ny][nx] = 0;

	while (cells.length > 0) {
		//Grab a random empty cell
		const index = Math.random() < .5 ? rand(cells.length) : cells.length - 1;
		({ x: nx, y: ny, z: nz, w: nw } = cells[index]);
		
		//Check if there are any directions in which we can carve out a space
		//without running into another empty cell, which would create a cycle
		const safe = [];

		if(isSafe((nx+1)%xsize, ny, nz, nw)){ safe.push("R"); }
		if(isSafe((nx+xsize-1)%xsize, ny, nz, nw)){ safe.push("L"); }
		
		if(isSafe(nx, (ny+1)%ysize, nz, nw)){ safe.push("U"); }
		if(isSafe(nx, (ny+ysize-1)%ysize, nz, nw)){ safe.push("D"); }
		
		if(isSafe(nx, ny, (nz+1)%zsize, nw)){ safe.push("F"); }
		if(isSafe(nx, ny, (nz+zsize-1)%zsize, nw)){ safe.push("B"); }
		
		if(isSafe(nx, ny, nz, (nw+1)%wsize)){ safe.push("A"); }
		if(isSafe(nx, ny, nz, (nw+wsize-1)%wsize)){ safe.push("K"); }
		
		if(safe.length == 0){
			cells.splice(index, 1);
		}else{
			//Pick a random direction & carve it out
			switch(pick(safe)){
			case 'R': nx = (nx + 1) % xsize;
				break;
			case 'L': nx = (nx - 1 + xsize) % xsize;
				break;
			case 'U': ny = (ny + 1) % ysize;
				break;
			case 'D': ny = (ny - 1 + ysize) % ysize;
				break;
			case 'F': nz = (nz + 1) % zsize;
				break;
			case 'B': nz = (nz - 1 + zsize) % zsize;
				break;
			case 'A': nw = (nw + 1) % wsize;
				break;
			case 'K': nw = (nw - 1 + wsize) % wsize;
				break;
			}

			grid[nw][nz][ny][nx] = 0;
			cells.push({ x: nx, y: ny, z: nz, w: nw });
		}
	}
	
	console.log("Completed Maze");
	return grid;
}

function Maze(size){
	this.size = size;
	this.start = {
		x: rand(size),
		y: rand(size),
		z: rand(size),
		w: rand(size)
	};
	this.grid = generate(this.start,size,size,size,size);
}

Maze.prototype.get = function(x,y,z,w){
	return this.grid[w][z][y][x];
}

Maze.prototype.set = function(x,y,z,w,val){
	return this.grid[w][z][y][x] = val;
}

Maze.prototype.cellIndex = function(x,y,z,w){
	const size = this.size;
	const size2 = size*size;
	const size3 = size2*size;
	return x*size3+y*size2+z*size+w;
};

function find_farthest(grid, start, xsize, ysize, zsize, wsize){
	let cells, ncells = [start];
	do {
		[cells, ncells] = [ncells, []];
		cells.forEach(function(cell){
			let n, {x, y, z, w} = cell;

			if(cell.prev != "R"){
				n = (x+1)%xsize;
				if(grid[w][z][y][n] != 255){ ncells.push({x:n,y:y,z:z,w:w,prev:"L",back:cell}); }
			}

			if(cell.prev != "L"){
				n = (x+xsize-1)%xsize;
				if(grid[w][z][y][n] != 255){ ncells.push({x:n,y:y,z:z,w:w,prev:"R",back:cell}); }
			}

			if(cell.prev != "U"){
				n = (y+1)%ysize;
				if(grid[w][z][n][x] != 255){ ncells.push({x:x,y:n,z:z,w:w,prev:"D",back:cell}); }
			}
			
			if(cell.prev != "D"){
				n = (y+ysize-1)%ysize;
				if(grid[w][z][n][x] != 255){ ncells.push({x:x,y:n,z:z,w:w,prev:"U",back:cell}); }
			}

			if(cell.prev != "F"){
				n = (z+1)%zsize;
				if(grid[w][n][y][x] != 255){ ncells.push({x:x,y:y,z:n,w:w,prev:"B",back:cell}); }
			}
			
			if(cell.prev != "B"){
				n = (z+zsize-1)%zsize;
				if(grid[w][n][y][x] != 255){ ncells.push({x:x,y:y,z:n,w:w,prev:"F",back:cell}); }
			}

			if(cell.prev != "A"){
				n = (w+1)%wsize;
				if(grid[n][z][y][x] != 255){ ncells.push({x:x,y:y,z:z,w:n,prev:"K",back:cell}); }
			}
			
			if(cell.prev != "K"){
				n = (w+wsize-1)%wsize;
				if(grid[n][z][y][x] != 255){ ncells.push({x:x,y:y,z:z,w:n,prev:"A",back:cell}); }
			}
		});
	} while(ncells.length > 0);
	return cells;
};

Maze.prototype.getLongestPath = function(){
	const path = [];
	const { size, grid, start } = this;

	let [ farthest ] = find_farthest(grid, start, size, size, size, size);
	delete farthest.prev;
	delete farthest.back;
	[ farthest ] = find_farthest(grid, farthest, size, size, size, size);

	while(farthest){
		path.push(farthest);
		farthest = farthest.back;
	}

	return path;
};

Maze.prototype.flatten = function(){
	const { size, grid } = this;
	const packed = new Uint8Array(size*size*size*size);

	let i = 0;
	for(let x = 0; x < size; x++)
	for(let y = 0; y < size; y++)
	for(let z = 0; z < size; z++)
	for(let w = 0; w < size; w++)
		packed[i++] = grid[w][z][y][x];
	
	return packed;
}
	
module.exports = Maze;