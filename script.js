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

// Global variable to remember the designated user-controlled snake's id.
window.userSnakeId = undefined;

// Global counter for consecutive iterations that the user snake is blocked.
let userBlockedCounter = 0;
// Number of consecutive iterations that the user snake must be blocked before ending the game.
const USER_BLOCKED_THRESHOLD = 3;

/*******************************************************
 * SNAKE CLASS DEFINITION
 *******************************************************/
class Snake {
	constructor(id, color) {
		this.id = id;
		this.color = color; // The unique color for the snake.
		this.body = []; // Array of segments (each with {x, y}).
		this.direction = { x: 0, y: 0 }; // Current movement direction.
		this.userControlled = false; // By default, snakes are AI controlled.
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
// Returns a safe move (a direction object) for the given snake.
// A safe move keeps the snake's head within bounds and avoids occupied cells.
// Returns null if no safe move exists.
function getNextDirection(snake) {
	// The four possible movement directions.
	let possibleDirections = [
		{ x: 1, y: 0 },
		{ x: -1, y: 0 },
		{ x: 0, y: 1 },
		{ x: 0, y: -1 },
	];

	// Prevent a reversal if the snake has more than one block.
	if (snake.body.length > 1) {
		let currentDir = snake.direction;
		possibleDirections = possibleDirections.filter(
			(dir) => !(dir.x === -currentDir.x && dir.y === -currentDir.y)
		);
	}

	const head = snake.body[0];
	let safeDirections = [];

	for (let dir of possibleDirections) {
		let newX = head.x + dir.x;
		let newY = head.y + dir.y;
		if (newX < 0 || newX >= gridWidth || newY < 0 || newY >= gridHeight)
			continue;
		if (isCellOccupied(newX, newY, snake)) continue;
		safeDirections.push(dir);
	}

	if (safeDirections.length > 0) {
		safeDirections.sort((a, b) => {
			let distA =
				Math.abs(head.x + a.x - food.x) + Math.abs(head.y + a.y - food.y);
			let distB =
				Math.abs(head.x + b.x - food.x) + Math.abs(head.y + b.y - food.y);
			return distA - distB;
		});
		return safeDirections[0];
	} else {
		return null;
	}
}

/*******************************************************
 * INITIALIZING THE SNAKES
 *******************************************************/
// Creates the specified number of snakes with unique colors.
// If the "Enable User Control" checkbox is checked, the designated snake
// (by default the first snake) is marked as user-controlled.
function createSnakes(count) {
	snakes = [];
	// Reset the blocked counter whenever we start a new game.
	userBlockedCounter = 0;

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

	// Read the current state of the user control checkbox.
	const enableUserControl = document.getElementById("userControlCheck").checked;

	for (let i = 0; i < count; i++) {
		let color;
		if (i < presetColors.length) {
			color = presetColors[i];
		} else {
			do {
				color = "#" + Math.floor(Math.random() * 16777215).toString(16);
			} while (snakes.some((s) => s.color === color));
		}

		const snake = new Snake(i, color);

		// Designate the first snake as user-controlled if enabled.
		if (i === 0 && enableUserControl) {
			snake.userControlled = true;
			window.userSnakeId = snake.id;
		}

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
 * DRAWING FUNCTIONS
 *******************************************************/
// Draws two white eyes on the snake's head based on its direction.
function drawEyes(snake) {
	const head = snake.body[0];
	const x = head.x * cellSize;
	const y = head.y * cellSize;
	const eyeRadius = cellSize * 0.1; // About 10% of the cell size

	let eye1, eye2;
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

// Draws a half white circle (mouth) on the head of the user-controlled snake,
// centered in the head block, with its flat (diameter) edge facing inward.
// In this updated version the default drawing (for snake moving right)
// is flipped compared to before.
// Draws a half white circle (mouth) on the head of the user-controlled snake,
// with its flat (diameter) edge facing inward (toward the snake’s body).
// The mouth is positioned so that it is significantly separated from the eyes.
function drawMouth(snake) {
  const head = snake.body[0];
  const headX = head.x * cellSize;
  const headY = head.y * cellSize;
  
  // We'll compute a custom mouth center based on the snake's direction.
  let mouthCenter = { x: 0, y: 0 };
  let rotation = 0;
  
  // For a block of size 'cellSize', assume:
  // - 30% along the dimension is the "near" side (closer to the block edge),
  // - 70% is the "far" side (closer to where the eyes are drawn).
  if (snake.direction.x === 1) { // Moving right
    // Eyes are at ~70% of width; place mouth at ~30%
    mouthCenter = { x: headX + cellSize * 0.3, y: headY + cellSize / 2 };
    rotation = 0;
  } else if (snake.direction.x === -1) { // Moving left
    // Eyes are at ~30% of width; place mouth at ~70%
    mouthCenter = { x: headX + cellSize * 0.7, y: headY + cellSize / 2 };
    rotation = Math.PI;
  } else if (snake.direction.y === 1) { // Moving down
    // Eyes are at ~70% of height; place mouth at ~30%
    mouthCenter = { x: headX + cellSize / 2, y: headY + cellSize * 0.3 };
    rotation = Math.PI / 2;
  } else if (snake.direction.y === -1) { // Moving up
    // Eyes are at ~30% of height; place mouth at ~70%
    mouthCenter = { x: headX + cellSize / 2, y: headY + cellSize * 0.7 };
    rotation = -Math.PI / 2;
  } else {
    // Default to moving right.
    mouthCenter = { x: headX + cellSize * 0.3, y: headY + cellSize / 2 };
    rotation = 0;
  }
  
  // Use the canvas transform to draw a half circle in our default orientation,
  // then rotate it so that its flat edge faces inward.
  // In our default drawing (for snake moving right), we draw a half circle
  // with its chord (flat edge) on the right.
  // (That is achieved by drawing an arc from 3π/2 to π/2 in anticlockwise mode.)
  ctx.save();
  // Translate to the computed mouth center.
  ctx.translate(mouthCenter.x, mouthCenter.y);
  // Rotate by the computed angle.
  ctx.rotate(rotation);
  
  ctx.fillStyle = "white";
  ctx.beginPath();
  // Draw the half circle:
  // In default (rightward) orientation, the arc from 3π/2 to π/2 (anticlockwise)
  // yields a half circle with the chord on the right.
  ctx.arc(0, 0, cellSize * 0.3, 3 * Math.PI / 2, Math.PI / 2, true);
  ctx.fill();
  
  ctx.restore();
}


/*******************************************************
 * THE GAME LOOP: UPDATING THE GAME STATE
 *******************************************************/
// In each iteration, every snake attempts to move.
// For user-controlled snakes, the move is based on the current (user-set) direction;
// for AI-controlled snakes, a safe move is computed.
function gameLoop() {
	let anyMoved = false;

	for (let snake of snakes) {
		const head = snake.body[0];
		let newHead;
		if (snake.userControlled) {
			// Use the user-updated direction.
			let intendedDir = snake.direction;
			newHead = { x: head.x + intendedDir.x, y: head.y + intendedDir.y };

			// Check if the intended move is safe.
			if (
				newHead.x < 0 ||
				newHead.x >= gridWidth ||
				newHead.y < 0 ||
				newHead.y >= gridHeight ||
				isCellOccupied(newHead.x, newHead.y, snake)
			) {
				// Do nothing if blocked (user may change direction).
			} else {
				if (newHead.x === food.x && newHead.y === food.y) {
					snake.body.unshift(newHead);
					generateFood();
				} else {
					snake.body.unshift(newHead);
					snake.body.pop();
				}
				anyMoved = true;
			}
		} else {
			// For AI-controlled snakes, get a safe move.
			const nextDir = getNextDirection(snake);
			if (nextDir !== null) {
				newHead = { x: head.x + nextDir.x, y: head.y + nextDir.y };
				if (newHead.x === food.x && newHead.y === food.y) {
					snake.body.unshift(newHead);
					generateFood();
				} else {
					snake.body.unshift(newHead);
					snake.body.pop();
				}
				snake.direction = nextDir;
				anyMoved = true;
			}
		}
	}

	// Game over condition:
	// If user control is enabled, check all four directions from the user-controlled snake's head.
	// Instead of immediately ending the game when no safe move exists this iteration,
	// we increment a counter and only end the game if the snake has been blocked for several consecutive iterations.
	if (document.getElementById("userControlCheck").checked) {
		let userSnake = snakes.find((s) => s.userControlled);
		if (userSnake) {
			const head = userSnake.body[0];
			const possibleDirections = [
				{ x: 1, y: 0 },
				{ x: -1, y: 0 },
				{ x: 0, y: 1 },
				{ x: 0, y: -1 },
			];
			let safeMoves = [];
			for (let dir of possibleDirections) {
				let newX = head.x + dir.x;
				let newY = head.y + dir.y;
				if (
					newX >= 0 &&
					newX < gridWidth &&
					newY >= 0 &&
					newY < gridHeight &&
					!isCellOccupied(newX, newY, userSnake)
				) {
					safeMoves.push(dir);
				}
			}
			if (safeMoves.length === 0) {
				userBlockedCounter++;
				if (userBlockedCounter >= USER_BLOCKED_THRESHOLD) {
					clearInterval(gameInterval);
					setTimeout(
						() =>
							alert(
								"Game Over! (User-controlled snake is completely surrounded)"
							),
						10
					);
					return;
				}
			} else {
				// Reset the counter if there is at least one safe move.
				userBlockedCounter = 0;
			}
		}
	} else {
		// When user control is disabled, end the game if no snake moved.
		if (!anyMoved) {
			clearInterval(gameInterval);
			setTimeout(() => alert("Game Over!"), 10);
			return;
		}
	}
	draw();
}

/*******************************************************
 * DRAWING THE GAME BOARD
 *******************************************************/
// Clears the canvas and redraws the food and all snakes.
function draw() {
	ctx.fillStyle = "#eee";
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	// Draw the food.
	ctx.fillStyle = food.color;
	ctx.fillRect(food.x * cellSize, food.y * cellSize, cellSize, cellSize);

	// Draw each snake.
	for (let snake of snakes) {
		ctx.fillStyle = snake.color;
		for (let i = 0; i < snake.body.length; i++) {
			const segment = snake.body[i];
			ctx.fillRect(
				segment.x * cellSize,
				segment.y * cellSize,
				cellSize,
				cellSize
			);
			// For the head, add facial features.
			if (i === 0) {
				if (snake.userControlled) {
          drawMouth(snake); // Draw the half circle (mouth) behind the eyes.
				}
				drawEyes(snake);
			}
		}
	}
}

/*******************************************************
 * KEYBOARD EVENT LISTENER FOR USER CONTROL
 *******************************************************/
// Listen for keydown events and update the direction of the user-controlled snake.
window.addEventListener("keydown", function (e) {
	const userSnake = snakes.find((s) => s.userControlled);
	if (!userSnake) return;

	let newDir;
	switch (e.key) {
		case "ArrowUp":
		case "w":
		case "W":
			newDir = { x: 0, y: -1 };
			break;
		case "ArrowDown":
		case "s":
		case "S":
			newDir = { x: 0, y: 1 };
			break;
		case "ArrowLeft":
		case "a":
		case "A":
			newDir = { x: -1, y: 0 };
			break;
		case "ArrowRight":
		case "d":
		case "D":
			newDir = { x: 1, y: 0 };
			break;
		default:
			return;
	}
	// Prevent a 180° reversal if the snake has more than one block.
	if (userSnake.body.length > 1) {
		if (
			userSnake.direction.x === -newDir.x &&
			userSnake.direction.y === -newDir.y
		) {
			return;
		}
	}
	userSnake.direction = newDir;
});

/*******************************************************
 * DYNAMIC USER CONTROL TOGGLE
 *******************************************************/
// Listen for changes to the "Enable User Control" checkbox to dynamically
// assign or remove user control from the designated snake.
document
	.getElementById("userControlCheck")
	.addEventListener("change", function (e) {
		const enableUserControl = e.target.checked;
		if (enableUserControl) {
			// If a snake was previously designated, re-enable user control on it.
			let designated = snakes.find((s) => s.id === window.userSnakeId);
			if (designated) {
				designated.userControlled = true;
			} else if (snakes.length > 0) {
				// Otherwise, designate the first snake.
				snakes[0].userControlled = true;
				window.userSnakeId = snakes[0].id;
			}
		} else {
			// Disable user control on the designated snake.
			let designated = snakes.find((s) => s.id === window.userSnakeId);
			if (designated) {
				designated.userControlled = false;
			}
		}
	});

/*******************************************************
 * EVENT LISTENER TO START THE GAME
 *******************************************************/
document.getElementById("startBtn").addEventListener("click", function () {
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
		chosenFoodColor = "yellow";
	}
	foodColor = chosenFoodColor;
	generateFood();

	if (gameInterval) clearInterval(gameInterval);
	gameInterval = setInterval(gameLoop, 100);
});
