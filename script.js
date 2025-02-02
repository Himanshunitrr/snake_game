/*******************************************************
 * GLOBAL VARIABLES AND SETUP
 *******************************************************/
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Define the size of each grid cell and calculate the number of cells.
const cellSize = 20;
const gridWidth = canvas.width / cellSize;
const gridHeight = canvas.height / cellSize;

// Global arrays and game state variables.
let snakes = []; // Array to hold all snake objects.
let food = { x: 0, y: 0, color: "yellow" }; // Food object with its color.
let gameInterval; // To hold the setInterval reference.
let foodColor = "yellow"; // Will be determined to avoid conflict with snake colors.

/*******************************************************
 * SNAKE CLASS DEFINITION
 *******************************************************/
class Snake {
	constructor(id, color) {
		this.id = id;
		this.color = color; // The unique color for the snake.
		this.body = []; // Array of segments (each with {x, y}).
		this.direction = { x: 0, y: 0 }; // Current movement direction.
	}
}

/*******************************************************
 * HELPER FUNCTIONS
 *******************************************************/

// Returns true if the given cell (x, y) is occupied by any snake segment.
// The optional ignoreTailSnake parameter lets us ignore the snake’s tail
// cell if that snake is about to move (which frees up that cell).
function isCellOccupied(x, y, ignoreTailSnake = null) {
	for (let snake of snakes) {
		for (let j = 0; j < snake.body.length; j++) {
			// If we're checking the snake’s own tail (which will be freed),
			// then ignore that cell.
			if (
				ignoreTailSnake &&
				snake === ignoreTailSnake &&
				j === snake.body.length - 1
			) {
				continue;
			}
			const segment = snake.body[j];
			if (segment.x === x && segment.y === y) {
				return true;
			}
		}
	}
	return false;
}

// Generates a new food location that is not occupied by any snake,
// and assigns it the predetermined food color.
function generateFood() {
	let valid = false;
	let x, y;
	while (!valid) {
		x = Math.floor(Math.random() * gridWidth);
		y = Math.floor(Math.random() * gridHeight);
		valid = true;
		for (let snake of snakes) {
			for (let segment of snake.body) {
				if (segment.x === x && segment.y === y) {
					valid = false;
					break;
				}
			}
			if (!valid) break;
		}
	}
	food = { x, y, color: foodColor };
}

/*******************************************************
 * SNAKE AI: DECIDING THE NEXT MOVE
 *******************************************************/
// This function returns a safe move (as a direction object) for the given snake.
// A safe move is one where the snake's head remains within bounds and
// does not move into an occupied cell. If no safe move exists, null is returned.
function getNextDirection(snake) {
	// The four possible movement directions.
	let possibleDirections = [
		{ x: 1, y: 0 },
		{ x: -1, y: 0 },
		{ x: 0, y: 1 },
		{ x: 0, y: -1 },
	];

	// Prevent the snake from reversing if it has more than one block.
	if (snake.body.length > 1) {
		let currentDir = snake.direction;
		possibleDirections = possibleDirections.filter(
			(dir) => !(dir.x === -currentDir.x && dir.y === -currentDir.y)
		);
	}

	const head = snake.body[0];
	let safeDirections = [];

	// Evaluate each possible direction.
	for (let dir of possibleDirections) {
		let newX = head.x + dir.x;
		let newY = head.y + dir.y;
		// Skip directions that would go out of bounds.
		if (newX < 0 || newX >= gridWidth || newY < 0 || newY >= gridHeight)
			continue;
		// Use ignoreTailSnake so that the cell freed by the snake’s tail is considered available.
		if (isCellOccupied(newX, newY, snake)) continue;
		safeDirections.push(dir);
	}

	if (safeDirections.length > 0) {
		// Sort safe moves by how close they get the snake to the food (Manhattan distance).
		safeDirections.sort((a, b) => {
			let distA =
				Math.abs(head.x + a.x - food.x) + Math.abs(head.y + a.y - food.y);
			let distB =
				Math.abs(head.x + b.x - food.x) + Math.abs(head.y + b.y - food.y);
			return distA - distB;
		});
		return safeDirections[0];
	} else {
		// No safe moves available.
		return null;
	}
}

/*******************************************************
 * INITIALIZING THE SNAKES
 *******************************************************/
// Creates the specified number of snakes with unique colors.
function createSnakes(count) {
	snakes = [];
	// Preset array of colors.
	const presetColors = [
		"red",
		"blue",
		"green",
		"orange",
		"purple",
		"cyan",
		"magenta",
		"brown",
		"pink",
		"lime",
		"teal",
		"navy",
		"maroon",
		"olive",
		"coral",
		"turquoise",
		"violet",
	];

	for (let i = 0; i < count; i++) {
		let color;
		if (i < presetColors.length) {
			color = presetColors[i];
		} else {
			// Generate a random hex color and ensure it is unique.
			do {
				color = "#" + Math.floor(Math.random() * 16777215).toString(16);
			} while (snakes.some((s) => s.color === color));
		}

		const snake = new Snake(i, color);

		// Choose a random unoccupied starting cell.
		let valid = false;
		let pos;
		while (!valid) {
			pos = {
				x: Math.floor(Math.random() * gridWidth),
				y: Math.floor(Math.random() * gridHeight),
			};
			valid = true;
			for (let other of snakes) {
				for (let segment of other.body) {
					if (segment.x === pos.x && segment.y === pos.y) {
						valid = false;
						break;
					}
				}
				if (!valid) break;
			}
		}
		snake.body.push(pos);

		// Set an initial random direction.
		const directions = [
			{ x: 1, y: 0 },
			{ x: -1, y: 0 },
			{ x: 0, y: 1 },
			{ x: 0, y: -1 },
		];
		snake.direction = directions[Math.floor(Math.random() * directions.length)];
		snakes.push(snake);
	}
}

/*******************************************************
 * DRAWING THE SNAKE EYES ON THE HEAD
 *******************************************************/
// Draws two white eyes on the head (first block) of the snake,
// positioned according to its current direction. We use ctx.save()
// and ctx.restore() so that the fillStyle used for the snake's body
// (its original color) remains unchanged.
function drawEyes(snake) {
	const head = snake.body[0];
	const x = head.x * cellSize;
	const y = head.y * cellSize;
	const eyeRadius = cellSize * 0.1; // About 10% of the cell size.

	let eye1, eye2;
	// Position the eyes based on the direction.
	if (snake.direction.x === 1) {
		// Moving right
		eye1 = { x: x + cellSize * 0.7, y: y + cellSize * 0.3 };
		eye2 = { x: x + cellSize * 0.7, y: y + cellSize * 0.7 };
	} else if (snake.direction.x === -1) {
		// Moving left
		eye1 = { x: x + cellSize * 0.3, y: y + cellSize * 0.3 };
		eye2 = { x: x + cellSize * 0.3, y: y + cellSize * 0.7 };
	} else if (snake.direction.y === 1) {
		// Moving down
		eye1 = { x: x + cellSize * 0.3, y: y + cellSize * 0.7 };
		eye2 = { x: x + cellSize * 0.7, y: y + cellSize * 0.7 };
	} else if (snake.direction.y === -1) {
		// Moving up
		eye1 = { x: x + cellSize * 0.3, y: y + cellSize * 0.3 };
		eye2 = { x: x + cellSize * 0.7, y: y + cellSize * 0.3 };
	} else {
		// Default: assume moving right.
		eye1 = { x: x + cellSize * 0.7, y: y + cellSize * 0.3 };
		eye2 = { x: x + cellSize * 0.7, y: y + cellSize * 0.7 };
	}

	ctx.save();
	ctx.fillStyle = "white";
	ctx.beginPath();
	ctx.arc(eye1.x, eye1.y, eyeRadius, 0, 2 * Math.PI);
	ctx.fill();
	ctx.beginPath();
	ctx.arc(eye2.x, eye2.y, eyeRadius, 0, 2 * Math.PI);
	ctx.fill();
	ctx.restore();
}

/*******************************************************
 * THE GAME LOOP: UPDATING THE GAME STATE
 *******************************************************/
// In each iteration, every snake tries to move using a safe move.
// If a snake has a safe move, it moves (and grows if it eats food).
// If no snake can move in an iteration, the game is over.
function gameLoop() {
	let anyMoved = false;

	for (let snake of snakes) {
		const nextDir = getNextDirection(snake);
		if (nextDir !== null) {
			const head = snake.body[0];
			const newHead = { x: head.x + nextDir.x, y: head.y + nextDir.y };

			// If the snake's head reaches the food, grow the snake.
			if (newHead.x === food.x && newHead.y === food.y) {
				snake.body.unshift(newHead);
				generateFood();
			} else {
				// Normal movement: add new head and remove tail.
				snake.body.unshift(newHead);
				snake.body.pop();
			}
			// Update the snake's direction for the next move.
			snake.direction = nextDir;
			anyMoved = true;
		}
		// If nextDir is null, this snake is blocked and does not move.
	}

	// End the game if no snake was able to move in this iteration.
	if (!anyMoved) {
		clearInterval(gameInterval);
		setTimeout(() => alert("Game Over!"), 10);
	}
	draw();
}

/*******************************************************
 * DRAWING THE GAME BOARD
 *******************************************************/
// Clears the canvas and redraws the food and all snakes.
function draw() {
	// Clear the canvas.
	ctx.fillStyle = "#eee";
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	// Draw the food.
	ctx.fillStyle = food.color;
	ctx.fillRect(food.x * cellSize, food.y * cellSize, cellSize, cellSize);

	// Draw each snake.
	for (let snake of snakes) {
		// Set fillStyle to the snake's unique color.
		ctx.fillStyle = snake.color;
		for (let i = 0; i < snake.body.length; i++) {
			const segment = snake.body[i];
			ctx.fillRect(
				segment.x * cellSize,
				segment.y * cellSize,
				cellSize,
				cellSize
			);
			// Draw the eyes on the head (first segment).
			if (i === 0) {
				drawEyes(snake);
			}
		}
	}
}

/*******************************************************
 * EVENT LISTENER TO START THE GAME
 *******************************************************/
document.getElementById("startBtn").addEventListener("click", function () {
	// Read the number of snakes from the input.
	const count = parseInt(document.getElementById("snakeCount").value) || 1;
	createSnakes(count);

	// Determine a food color that does not conflict with any snake's color.
	const snakeColors = new Set(snakes.map((s) => s.color));
	const foodCandidates = [
		"yellow",
		"black",
		"white",
		"gray",
		"silver",
		"gold",
		"teal",
		"navy",
	];
	let chosenFoodColor = foodCandidates.find((color) => !snakeColors.has(color));
	if (!chosenFoodColor) {
		chosenFoodColor = "yellow"; // Fallback if all candidate colors are used.
	}
	foodColor = chosenFoodColor;
	generateFood();

	if (gameInterval) clearInterval(gameInterval);
	gameInterval = setInterval(gameLoop, 100);
});
