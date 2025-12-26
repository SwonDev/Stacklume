"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  Trash2,
  Grid3x3,
  Download,
  MapPin,
  Flag,
  Square,
  Settings,
  RotateCcw,
  Mountain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
// Note: motion/react has compatibility issues with React 19, using regular elements instead
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { cn } from "@/lib/utils";

interface PathfindingWidgetProps {
  widget: Widget;
}

type Algorithm = "astar" | "dijkstra" | "bfs" | "dfs" | "greedy";
type Heuristic = "manhattan" | "euclidean" | "chebyshev";
type CellType = "empty" | "wall" | "start" | "end" | "visited" | "frontier" | "path" | "weight";
type DrawMode = "wall" | "weight" | "start" | "end" | "erase";
type MazeAlgorithm = "recursive-backtracking" | "prim";

interface Cell {
  x: number;
  y: number;
  type: CellType;
  weight: number;
  f?: number;
  g?: number;
  h?: number;
  parent?: Cell;
}

interface PathfindingState {
  grid: Cell[][];
  start: { x: number; y: number } | null;
  end: { x: number; y: number } | null;
  isRunning: boolean;
  isPaused: boolean;
  visitedNodes: number;
  pathLength: number;
  pathCost: number;
}

const GRID_SIZES = [10, 20, 30] as const;
const CELL_COLORS = {
  empty: "bg-background",
  wall: "bg-foreground",
  start: "bg-green-500",
  end: "bg-red-500",
  visited: "bg-blue-400/30",
  frontier: "bg-purple-400/50",
  path: "bg-yellow-400",
  weight: "bg-orange-300/40",
};

const ALGORITHMS: { value: Algorithm; label: string; description: string }[] = [
  { value: "astar", label: "A*", description: "Optimal, uses heuristics" },
  { value: "dijkstra", label: "Dijkstra", description: "Optimal, guarantees shortest" },
  { value: "bfs", label: "BFS", description: "Unweighted, layer by layer" },
  { value: "dfs", label: "DFS", description: "Depth-first exploration" },
  { value: "greedy", label: "Greedy Best-First", description: "Fast, not always optimal" },
];

const HEURISTICS: { value: Heuristic; label: string }[] = [
  { value: "manhattan", label: "Manhattan" },
  { value: "euclidean", label: "Euclidean" },
  { value: "chebyshev", label: "Chebyshev" },
];

export function PathfindingWidget({ widget }: PathfindingWidgetProps) {
  // Note: Use getState() for functions to prevent re-render loops
  const _canvasRef = useRef<HTMLCanvasElement>(null);
  const _animationFrameRef = useRef<number | undefined>(undefined);

  // Config state
  const [gridSize, setGridSize] = useState<number>(widget.config?.pathfindingGridSize || 20);
  const [algorithm, setAlgorithm] = useState<Algorithm>(widget.config?.pathfindingAlgorithm || "astar");
  const [heuristic, setHeuristic] = useState<Heuristic>(widget.config?.pathfindingHeuristic || "manhattan");
  const [speed, setSpeed] = useState<number>(widget.config?.pathfindingSpeed || 50);
  const [allowDiagonal, setAllowDiagonal] = useState<boolean>(widget.config?.pathfindingAllowDiagonal ?? true);

  // Drawing state
  const [drawMode, setDrawMode] = useState<DrawMode>("wall");
  const [isDrawing, setIsDrawing] = useState(false);

  // Pathfinding state
  const [state, setState] = useState<PathfindingState>({
    grid: initializeGrid(gridSize),
    start: null,
    end: null,
    isRunning: false,
    isPaused: false,
    visitedNodes: 0,
    pathLength: 0,
    pathCost: 0,
  });

  // Initialize grid
  function initializeGrid(size: number): Cell[][] {
    const grid: Cell[][] = [];
    for (let y = 0; y < size; y++) {
      const row: Cell[] = [];
      for (let x = 0; x < size; x++) {
        row.push({ x, y, type: "empty", weight: 1 });
      }
      grid.push(row);
    }
    return grid;
  }

  // Heuristic functions
  const calculateHeuristic = useCallback((cell: Cell, end: Cell): number => {
    const dx = Math.abs(cell.x - end.x);
    const dy = Math.abs(cell.y - end.y);

    switch (heuristic) {
      case "manhattan":
        return dx + dy;
      case "euclidean":
        return Math.sqrt(dx * dx + dy * dy);
      case "chebyshev":
        return Math.max(dx, dy);
      default:
        return dx + dy;
    }
  }, [heuristic]);

  // Get neighbors
  const getNeighbors = useCallback((cell: Cell, grid: Cell[][]): Cell[] => {
    const neighbors: Cell[] = [];
    const directions = [
      { x: 0, y: -1 }, // Up
      { x: 1, y: 0 },  // Right
      { x: 0, y: 1 },  // Down
      { x: -1, y: 0 }, // Left
    ];

    if (allowDiagonal) {
      directions.push(
        { x: 1, y: -1 },  // Up-Right
        { x: 1, y: 1 },   // Down-Right
        { x: -1, y: 1 },  // Down-Left
        { x: -1, y: -1 }  // Up-Left
      );
    }

    for (const dir of directions) {
      const newX = cell.x + dir.x;
      const newY = cell.y + dir.y;

      if (newX >= 0 && newX < gridSize && newY >= 0 && newY < gridSize) {
        const neighbor = grid[newY][newX];
        if (neighbor.type !== "wall") {
          neighbors.push(neighbor);
        }
      }
    }

    return neighbors;
  }, [gridSize, allowDiagonal]);

  // A* Algorithm
  const runAStar = useCallback(async () => {
    if (!state.start || !state.end) return;

    const grid = state.grid.map(row => row.map(cell => ({ ...cell })));
    const startCell = grid[state.start.y][state.start.x];
    const endCell = grid[state.end.y][state.end.x];

    const openSet: Cell[] = [startCell];
    const closedSet: Set<string> = new Set();

    startCell.g = 0;
    startCell.h = calculateHeuristic(startCell, endCell);
    startCell.f = startCell.g + startCell.h;

    let visitedCount = 0;

    while (openSet.length > 0 && !state.isPaused) {
      // Sort by f value
      openSet.sort((a, b) => (a.f || 0) - (b.f || 0));
      const current = openSet.shift()!;

      const key = `${current.x},${current.y}`;
      if (closedSet.has(key)) continue;
      closedSet.add(key);

      // Mark as visited
      if (current !== startCell && current !== endCell) {
        grid[current.y][current.x].type = "visited";
        visitedCount++;
      }

      // Check if reached end
      if (current.x === endCell.x && current.y === endCell.y) {
        // Reconstruct path
        const path: Cell[] = [];
        let pathCost = 0;
        let temp: Cell | undefined = current;
        while (temp && temp !== startCell) {
          path.unshift(temp);
          pathCost += temp.weight;
          temp = temp.parent;
        }

        // Mark path
        for (const cell of path) {
          if (cell !== endCell) {
            grid[cell.y][cell.x].type = "path";
          }
        }

        setState(prev => ({
          ...prev,
          grid,
          isRunning: false,
          visitedNodes: visitedCount,
          pathLength: path.length,
          pathCost,
        }));
        return;
      }

      // Check neighbors
      const neighbors = getNeighbors(current, grid);
      for (const neighbor of neighbors) {
        const key = `${neighbor.x},${neighbor.y}`;
        if (closedSet.has(key)) continue;

        const tentativeG = (current.g || 0) + neighbor.weight;

        if (!openSet.includes(neighbor)) {
          openSet.push(neighbor);
        } else if (tentativeG >= (neighbor.g || Infinity)) {
          continue;
        }

        neighbor.parent = current;
        neighbor.g = tentativeG;
        neighbor.h = calculateHeuristic(neighbor, endCell);
        neighbor.f = neighbor.g + neighbor.h;

        if (neighbor !== endCell) {
          grid[neighbor.y][neighbor.x].type = "frontier";
        }
      }

      // Update state and delay
      setState(prev => ({ ...prev, grid: grid.map(row => [...row]), visitedNodes: visitedCount }));
      await new Promise(resolve => setTimeout(resolve, 100 - speed));
    }

    setState(prev => ({ ...prev, isRunning: false }));
  }, [state.start, state.end, state.grid, state.isPaused, speed, calculateHeuristic, getNeighbors]);

  // Dijkstra Algorithm
  const runDijkstra = useCallback(async () => {
    if (!state.start || !state.end) return;

    const grid = state.grid.map(row => row.map(cell => ({ ...cell })));
    const startCell = grid[state.start.y][state.start.x];
    const endCell = grid[state.end.y][state.end.x];

    const queue: Cell[] = [startCell];
    const distances = new Map<string, number>();
    distances.set(`${startCell.x},${startCell.y}`, 0);

    let visitedCount = 0;

    while (queue.length > 0 && !state.isPaused) {
      queue.sort((a, b) => {
        const distA = distances.get(`${a.x},${a.y}`) || Infinity;
        const distB = distances.get(`${b.x},${b.y}`) || Infinity;
        return distA - distB;
      });

      const current = queue.shift()!;
      const currentKey = `${current.x},${current.y}`;
      const currentDist = distances.get(currentKey) || 0;

      if (current !== startCell && current !== endCell) {
        grid[current.y][current.x].type = "visited";
        visitedCount++;
      }

      if (current.x === endCell.x && current.y === endCell.y) {
        const path: Cell[] = [];
        let pathCost = 0;
        let temp: Cell | undefined = current;
        while (temp && temp !== startCell) {
          path.unshift(temp);
          pathCost += temp.weight;
          temp = temp.parent;
        }

        for (const cell of path) {
          if (cell !== endCell) {
            grid[cell.y][cell.x].type = "path";
          }
        }

        setState(prev => ({
          ...prev,
          grid,
          isRunning: false,
          visitedNodes: visitedCount,
          pathLength: path.length,
          pathCost,
        }));
        return;
      }

      const neighbors = getNeighbors(current, grid);
      for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.x},${neighbor.y}`;
        const newDist = currentDist + neighbor.weight;

        if (!distances.has(neighborKey) || newDist < distances.get(neighborKey)!) {
          distances.set(neighborKey, newDist);
          neighbor.parent = current;

          if (!queue.includes(neighbor)) {
            queue.push(neighbor);
          }

          if (neighbor !== endCell) {
            grid[neighbor.y][neighbor.x].type = "frontier";
          }
        }
      }

      setState(prev => ({ ...prev, grid: grid.map(row => [...row]), visitedNodes: visitedCount }));
      await new Promise(resolve => setTimeout(resolve, 100 - speed));
    }

    setState(prev => ({ ...prev, isRunning: false }));
  }, [state.start, state.end, state.grid, state.isPaused, speed, getNeighbors]);

  // BFS Algorithm
  const runBFS = useCallback(async () => {
    if (!state.start || !state.end) return;

    const grid = state.grid.map(row => row.map(cell => ({ ...cell })));
    const startCell = grid[state.start.y][state.start.x];
    const endCell = grid[state.end.y][state.end.x];

    const queue: Cell[] = [startCell];
    const visited = new Set<string>([`${startCell.x},${startCell.y}`]);

    let visitedCount = 0;

    while (queue.length > 0 && !state.isPaused) {
      const current = queue.shift()!;

      if (current !== startCell && current !== endCell) {
        grid[current.y][current.x].type = "visited";
        visitedCount++;
      }

      if (current.x === endCell.x && current.y === endCell.y) {
        const path: Cell[] = [];
        let pathCost = 0;
        let temp: Cell | undefined = current;
        while (temp && temp !== startCell) {
          path.unshift(temp);
          pathCost += temp.weight;
          temp = temp.parent;
        }

        for (const cell of path) {
          if (cell !== endCell) {
            grid[cell.y][cell.x].type = "path";
          }
        }

        setState(prev => ({
          ...prev,
          grid,
          isRunning: false,
          visitedNodes: visitedCount,
          pathLength: path.length,
          pathCost,
        }));
        return;
      }

      const neighbors = getNeighbors(current, grid);
      for (const neighbor of neighbors) {
        const key = `${neighbor.x},${neighbor.y}`;
        if (!visited.has(key)) {
          visited.add(key);
          neighbor.parent = current;
          queue.push(neighbor);

          if (neighbor !== endCell) {
            grid[neighbor.y][neighbor.x].type = "frontier";
          }
        }
      }

      setState(prev => ({ ...prev, grid: grid.map(row => [...row]), visitedNodes: visitedCount }));
      await new Promise(resolve => setTimeout(resolve, 100 - speed));
    }

    setState(prev => ({ ...prev, isRunning: false }));
  }, [state.start, state.end, state.grid, state.isPaused, speed, getNeighbors]);

  // DFS Algorithm
  const runDFS = useCallback(async () => {
    if (!state.start || !state.end) return;

    const grid = state.grid.map(row => row.map(cell => ({ ...cell })));
    const startCell = grid[state.start.y][state.start.x];
    const endCell = grid[state.end.y][state.end.x];

    const stack: Cell[] = [startCell];
    const visited = new Set<string>([`${startCell.x},${startCell.y}`]);

    let visitedCount = 0;

    while (stack.length > 0 && !state.isPaused) {
      const current = stack.pop()!;

      if (current !== startCell && current !== endCell) {
        grid[current.y][current.x].type = "visited";
        visitedCount++;
      }

      if (current.x === endCell.x && current.y === endCell.y) {
        const path: Cell[] = [];
        let pathCost = 0;
        let temp: Cell | undefined = current;
        while (temp && temp !== startCell) {
          path.unshift(temp);
          pathCost += temp.weight;
          temp = temp.parent;
        }

        for (const cell of path) {
          if (cell !== endCell) {
            grid[cell.y][cell.x].type = "path";
          }
        }

        setState(prev => ({
          ...prev,
          grid,
          isRunning: false,
          visitedNodes: visitedCount,
          pathLength: path.length,
          pathCost,
        }));
        return;
      }

      const neighbors = getNeighbors(current, grid);
      for (const neighbor of neighbors.reverse()) {
        const key = `${neighbor.x},${neighbor.y}`;
        if (!visited.has(key)) {
          visited.add(key);
          neighbor.parent = current;
          stack.push(neighbor);

          if (neighbor !== endCell) {
            grid[neighbor.y][neighbor.x].type = "frontier";
          }
        }
      }

      setState(prev => ({ ...prev, grid: grid.map(row => [...row]), visitedNodes: visitedCount }));
      await new Promise(resolve => setTimeout(resolve, 100 - speed));
    }

    setState(prev => ({ ...prev, isRunning: false }));
  }, [state.start, state.end, state.grid, state.isPaused, speed, getNeighbors]);

  // Greedy Best-First
  const runGreedy = useCallback(async () => {
    if (!state.start || !state.end) return;

    const grid = state.grid.map(row => row.map(cell => ({ ...cell })));
    const startCell = grid[state.start.y][state.start.x];
    const endCell = grid[state.end.y][state.end.x];

    const openSet: Cell[] = [startCell];
    const visited = new Set<string>();

    startCell.h = calculateHeuristic(startCell, endCell);

    let visitedCount = 0;

    while (openSet.length > 0 && !state.isPaused) {
      openSet.sort((a, b) => (a.h || 0) - (b.h || 0));
      const current = openSet.shift()!;

      const key = `${current.x},${current.y}`;
      if (visited.has(key)) continue;
      visited.add(key);

      if (current !== startCell && current !== endCell) {
        grid[current.y][current.x].type = "visited";
        visitedCount++;
      }

      if (current.x === endCell.x && current.y === endCell.y) {
        const path: Cell[] = [];
        let pathCost = 0;
        let temp: Cell | undefined = current;
        while (temp && temp !== startCell) {
          path.unshift(temp);
          pathCost += temp.weight;
          temp = temp.parent;
        }

        for (const cell of path) {
          if (cell !== endCell) {
            grid[cell.y][cell.x].type = "path";
          }
        }

        setState(prev => ({
          ...prev,
          grid,
          isRunning: false,
          visitedNodes: visitedCount,
          pathLength: path.length,
          pathCost,
        }));
        return;
      }

      const neighbors = getNeighbors(current, grid);
      for (const neighbor of neighbors) {
        const key = `${neighbor.x},${neighbor.y}`;
        if (visited.has(key)) continue;

        neighbor.parent = current;
        neighbor.h = calculateHeuristic(neighbor, endCell);

        if (!openSet.includes(neighbor)) {
          openSet.push(neighbor);
        }

        if (neighbor !== endCell) {
          grid[neighbor.y][neighbor.x].type = "frontier";
        }
      }

      setState(prev => ({ ...prev, grid: grid.map(row => [...row]), visitedNodes: visitedCount }));
      await new Promise(resolve => setTimeout(resolve, 100 - speed));
    }

    setState(prev => ({ ...prev, isRunning: false }));
  }, [state.start, state.end, state.grid, state.isPaused, speed, calculateHeuristic, getNeighbors]);

  // Run algorithm
  const runAlgorithm = useCallback(() => {
    if (!state.start || !state.end) {
      alert("Please set start and end points first!");
      return;
    }

    // Clear previous visualization
    const clearedGrid = state.grid.map(row =>
      row.map(cell => ({
        ...cell,
        type: cell.type === "visited" || cell.type === "frontier" || cell.type === "path"
          ? "empty"
          : cell.type,
        parent: undefined,
        g: undefined,
        h: undefined,
        f: undefined,
      }))
    );

    setState(prev => ({
      ...prev,
      grid: clearedGrid,
      isRunning: true,
      isPaused: false,
      visitedNodes: 0,
      pathLength: 0,
      pathCost: 0,
    }));

    setTimeout(() => {
      switch (algorithm) {
        case "astar":
          runAStar();
          break;
        case "dijkstra":
          runDijkstra();
          break;
        case "bfs":
          runBFS();
          break;
        case "dfs":
          runDFS();
          break;
        case "greedy":
          runGreedy();
          break;
      }
    }, 100);
  }, [algorithm, state.start, state.end, state.grid, runAStar, runDijkstra, runBFS, runDFS, runGreedy]);

  // Generate maze using recursive backtracking
  const generateMaze = useCallback((mazeAlgorithm: MazeAlgorithm) => {
    const grid = initializeGrid(gridSize);

    if (mazeAlgorithm === "recursive-backtracking") {
      // Fill with walls
      for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
          grid[y][x].type = "wall";
        }
      }

      const stack: { x: number; y: number }[] = [];
      const startX = Math.floor(Math.random() * gridSize);
      const startY = Math.floor(Math.random() * gridSize);

      grid[startY][startX].type = "empty";
      stack.push({ x: startX, y: startY });

      while (stack.length > 0) {
        const current = stack[stack.length - 1];
        const neighbors: { x: number; y: number; dx: number; dy: number }[] = [];

        const directions = [
          { dx: 0, dy: -2 }, { dx: 2, dy: 0 }, { dx: 0, dy: 2 }, { dx: -2, dy: 0 }
        ];

        for (const { dx, dy } of directions) {
          const nx = current.x + dx;
          const ny = current.y + dy;

          if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize && grid[ny][nx].type === "wall") {
            neighbors.push({ x: nx, y: ny, dx, dy });
          }
        }

        if (neighbors.length > 0) {
          const next = neighbors[Math.floor(Math.random() * neighbors.length)];
          const wallX = current.x + next.dx / 2;
          const wallY = current.y + next.dy / 2;

          grid[next.y][next.x].type = "empty";
          grid[wallY][wallX].type = "empty";

          stack.push({ x: next.x, y: next.y });
        } else {
          stack.pop();
        }
      }
    } else if (mazeAlgorithm === "prim") {
      // Prim&apos;s algorithm
      for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
          grid[y][x].type = "wall";
        }
      }

      const walls: { x: number; y: number }[] = [];
      const startX = Math.floor(gridSize / 2);
      const startY = Math.floor(gridSize / 2);

      grid[startY][startX].type = "empty";

      const addWalls = (x: number, y: number) => {
        const directions = [
          { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }
        ];

        for (const { dx, dy } of directions) {
          const nx = x + dx;
          const ny = y + dy;

          if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize && grid[ny][nx].type === "wall") {
            walls.push({ x: nx, y: ny });
          }
        }
      };

      addWalls(startX, startY);

      while (walls.length > 0) {
        const randomIndex = Math.floor(Math.random() * walls.length);
        const wall = walls.splice(randomIndex, 1)[0];

        let emptyCells = 0;
        const directions = [
          { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }
        ];

        for (const { dx, dy } of directions) {
          const nx = wall.x + dx;
          const ny = wall.y + dy;

          if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize && grid[ny][nx].type === "empty") {
            emptyCells++;
          }
        }

        if (emptyCells === 1) {
          grid[wall.y][wall.x].type = "empty";
          addWalls(wall.x, wall.y);
        }
      }
    }

    setState(prev => ({ ...prev, grid, start: null, end: null }));
  }, [gridSize]);

  // Handle cell click
  const handleCellClick = (x: number, y: number) => {
    if (state.isRunning) return;

    const newGrid = state.grid.map(row => [...row]);
    const cell = newGrid[y][x];

    if (drawMode === "start") {
      // Clear previous start
      if (state.start) {
        newGrid[state.start.y][state.start.x].type = "empty";
      }
      cell.type = "start";
      setState(prev => ({ ...prev, grid: newGrid, start: { x, y } }));
    } else if (drawMode === "end") {
      // Clear previous end
      if (state.end) {
        newGrid[state.end.y][state.end.x].type = "empty";
      }
      cell.type = "end";
      setState(prev => ({ ...prev, grid: newGrid, end: { x, y } }));
    } else if (drawMode === "wall") {
      if (cell.type === "empty" || cell.type === "weight") {
        cell.type = "wall";
        cell.weight = 1;
      }
      setState(prev => ({ ...prev, grid: newGrid }));
    } else if (drawMode === "weight") {
      if (cell.type === "empty" || cell.type === "wall") {
        cell.type = "weight";
        cell.weight = 3;
      }
      setState(prev => ({ ...prev, grid: newGrid }));
    } else if (drawMode === "erase") {
      if (cell.type === "wall" || cell.type === "weight") {
        cell.type = "empty";
        cell.weight = 1;
      }
      setState(prev => ({ ...prev, grid: newGrid }));
    }
  };

  // Clear functions
  const clearPath = () => {
    const clearedGrid = state.grid.map(row =>
      row.map(cell => ({
        ...cell,
        type: cell.type === "visited" || cell.type === "frontier" || cell.type === "path"
          ? "empty"
          : cell.type,
        parent: undefined,
        g: undefined,
        h: undefined,
        f: undefined,
      }))
    );
    setState(prev => ({ ...prev, grid: clearedGrid, visitedNodes: 0, pathLength: 0, pathCost: 0 }));
  };

  const clearWalls = () => {
    const clearedGrid = state.grid.map(row =>
      row.map(cell => ({
        ...cell,
        type: cell.type === "wall" || cell.type === "weight" ? "empty" : cell.type,
        weight: 1,
      }))
    );
    setState(prev => ({ ...prev, grid: clearedGrid }));
  };

  const clearAll = () => {
    setState({
      grid: initializeGrid(gridSize),
      start: null,
      end: null,
      isRunning: false,
      isPaused: false,
      visitedNodes: 0,
      pathLength: 0,
      pathCost: 0,
    });
  };

  // Export/Import grid
  const exportGrid = () => {
    const data = {
      gridSize,
      grid: state.grid.map(row => row.map(cell => ({ x: cell.x, y: cell.y, type: cell.type, weight: cell.weight }))),
      start: state.start,
      end: state.end,
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pathfinding-grid-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Change grid size
  const handleGridSizeChange = (newSize: number) => {
    setGridSize(newSize);
    setState({
      grid: initializeGrid(newSize),
      start: null,
      end: null,
      isRunning: false,
      isPaused: false,
      visitedNodes: 0,
      pathLength: 0,
      pathCost: 0,
    });
  };

  // Save config on changes - use getState() to avoid re-render loops
  useEffect(() => {
    useWidgetStore.getState().updateWidget(widget.id, {
      config: {
        pathfindingGridSize: gridSize,
        pathfindingAlgorithm: algorithm,
        pathfindingHeuristic: heuristic,
        pathfindingSpeed: speed,
        pathfindingAllowDiagonal: allowDiagonal,
      },
    });
     
  }, [gridSize, algorithm, heuristic, speed, allowDiagonal, widget.id]);

  const cellSize = Math.floor(Math.min(400 / gridSize, 40));

  return (
    <div className="h-full w-full @container">
      <div className="flex h-full flex-col gap-3 p-4">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Algorithm Selection */}
          <Select value={algorithm} onValueChange={(v) => setAlgorithm(v as Algorithm)}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALGORITHMS.map((algo) => (
                <SelectItem key={algo.value} value={algo.value} className="text-xs">
                  <div>
                    <div className="font-medium">{algo.label}</div>
                    <div className="text-[10px] text-muted-foreground">{algo.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Grid Size */}
          <Select value={gridSize.toString()} onValueChange={(v) => handleGridSizeChange(Number(v))}>
            <SelectTrigger className="h-8 w-[100px] text-xs">
              <Grid3x3 className="mr-1 h-3 w-3" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GRID_SIZES.map((size) => (
                <SelectItem key={size} value={size.toString()} className="text-xs">
                  {size}x{size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Play/Pause/Step */}
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="default"
              onClick={runAlgorithm}
              disabled={state.isRunning || !state.start || !state.end}
              className="h-8 px-3"
            >
              <Play className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setState(prev => ({ ...prev, isPaused: !prev.isPaused }))}
              disabled={!state.isRunning}
              className="h-8 px-3"
            >
              {state.isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
            </Button>
          </div>

          {/* Clear Buttons */}
          <Button size="sm" variant="outline" onClick={clearPath} className="h-8 px-3 text-xs">
            <RotateCcw className="mr-1 h-3 w-3" /> Path
          </Button>
          <Button size="sm" variant="outline" onClick={clearWalls} className="h-8 px-3 text-xs">
            <Square className="mr-1 h-3 w-3" /> Walls
          </Button>
          <Button size="sm" variant="outline" onClick={clearAll} className="h-8 px-3 text-xs">
            <Trash2 className="mr-1 h-3 w-3" /> All
          </Button>

          {/* Settings Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 px-3">
                <Settings className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <ScrollArea className="h-[300px] pr-3">
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs">Speed: {speed}%</Label>
                    <Slider
                      value={[speed]}
                      onValueChange={(v) => setSpeed(v[0])}
                      min={0}
                      max={100}
                      step={10}
                      className="mt-2"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Diagonal Movement</Label>
                    <Switch checked={allowDiagonal} onCheckedChange={setAllowDiagonal} />
                  </div>

                  {(algorithm === "astar" || algorithm === "greedy") && (
                    <div>
                      <Label className="text-xs">Heuristic</Label>
                      <Select value={heuristic} onValueChange={(v) => setHeuristic(v as Heuristic)}>
                        <SelectTrigger className="mt-2 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {HEURISTICS.map((h) => (
                            <SelectItem key={h.value} value={h.value} className="text-xs">
                              {h.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2 border-t pt-3">
                    <Label className="text-xs font-semibold">Generate Maze</Label>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => generateMaze("recursive-backtracking")}
                        className="flex-1 text-xs"
                      >
                        Recursive
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => generateMaze("prim")}
                        className="flex-1 text-xs"
                      >
                        Prim&apos;s
                      </Button>
                    </div>
                  </div>

                  <Button size="sm" variant="outline" onClick={exportGrid} className="w-full text-xs">
                    <Download className="mr-2 h-3 w-3" /> Export Grid
                  </Button>
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>

        {/* Draw Mode Selection */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Draw:</span>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={drawMode === "start" ? "default" : "outline"}
              onClick={() => setDrawMode("start")}
              className="h-7 px-2 text-xs"
            >
              <MapPin className="mr-1 h-3 w-3" /> Start
            </Button>
            <Button
              size="sm"
              variant={drawMode === "end" ? "default" : "outline"}
              onClick={() => setDrawMode("end")}
              className="h-7 px-2 text-xs"
            >
              <Flag className="mr-1 h-3 w-3" /> End
            </Button>
            <Button
              size="sm"
              variant={drawMode === "wall" ? "default" : "outline"}
              onClick={() => setDrawMode("wall")}
              className="h-7 px-2 text-xs"
            >
              <Square className="mr-1 h-3 w-3" /> Wall
            </Button>
            <Button
              size="sm"
              variant={drawMode === "weight" ? "default" : "outline"}
              onClick={() => setDrawMode("weight")}
              className="h-7 px-2 text-xs"
            >
              <Mountain className="mr-1 h-3 w-3" /> Weight
            </Button>
            <Button
              size="sm"
              variant={drawMode === "erase" ? "default" : "outline"}
              onClick={() => setDrawMode("erase")}
              className="h-7 px-2 text-xs"
            >
              <Trash2 className="mr-1 h-3 w-3" /> Erase
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-4 text-xs">
          <div>
            <span className="text-muted-foreground">Visited:</span>{" "}
            <span className="font-medium">{state.visitedNodes}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Path Length:</span>{" "}
            <span className="font-medium">{state.pathLength}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Path Cost:</span>{" "}
            <span className="font-medium">{state.pathCost.toFixed(1)}</span>
          </div>
        </div>

        {/* Grid */}
        <ScrollArea className="flex-1">
          <div
            className="inline-grid gap-[1px] rounded border bg-border p-[1px]"
            style={{
              gridTemplateColumns: `repeat(${gridSize}, ${cellSize}px)`,
              gridTemplateRows: `repeat(${gridSize}, ${cellSize}px)`,
            }}
          >
            {state.grid.map((row, y) =>
              row.map((cell, x) => (
                <button
                  key={`${x}-${y}`}
                  className={cn(
                    "relative rounded-sm transition-all hover:opacity-80 hover:scale-105 active:scale-95",
                    CELL_COLORS[cell.type]
                  )}
                  style={{ width: cellSize, height: cellSize }}
                  onClick={() => handleCellClick(x, y)}
                  onMouseDown={() => setIsDrawing(true)}
                  onMouseUp={() => setIsDrawing(false)}
                  onMouseEnter={() => {
                    if (isDrawing && !state.isRunning) {
                      handleCellClick(x, y);
                    }
                  }}
                >
                  {cell.type === "start" && <MapPin className="h-full w-full p-0.5 text-white" />}
                  {cell.type === "end" && <Flag className="h-full w-full p-0.5 text-white" />}
                  {cell.type === "weight" && (
                    <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold">
                      {cell.weight}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-[10px]">
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded bg-green-500" />
            <span>Start</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded bg-red-500" />
            <span>End</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded bg-foreground" />
            <span>Wall</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded bg-orange-300" />
            <span>Weight (3x)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded bg-blue-400/30" />
            <span>Visited</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded bg-purple-400/50" />
            <span>Frontier</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded bg-yellow-400" />
            <span>Path</span>
          </div>
        </div>
      </div>
    </div>
  );
}
