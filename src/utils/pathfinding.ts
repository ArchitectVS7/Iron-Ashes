/**
 * Pathfinding — BFS shortest path on the board graph.
 *
 * The board is an unweighted graph, so BFS gives optimal shortest paths.
 * Used for movement cost calculation (1 War Banner per node traversed).
 */

import { BoardDefinition } from '../models/board.js';

/**
 * Find the shortest path between two nodes on the board.
 *
 * Returns the ordered list of node IDs from source to target (inclusive).
 * Returns null if no path exists.
 */
export function findShortestPath(
  definition: BoardDefinition,
  source: string,
  target: string,
): string[] | null {
  if (source === target) return [source];

  if (!definition.nodes[source] || !definition.nodes[target]) {
    return null;
  }

  const visited = new Set<string>([source]);
  const parent = new Map<string, string>();
  const queue: string[] = [source];

  while (queue.length > 0) {
    const current = queue.shift()!;

    for (const neighbor of definition.nodes[current].connections) {
      if (visited.has(neighbor)) continue;
      visited.add(neighbor);
      parent.set(neighbor, current);

      if (neighbor === target) {
        // Reconstruct path
        const path: string[] = [target];
        let node = target;
        while (node !== source) {
          node = parent.get(node)!;
          path.push(node);
        }
        return path.reverse();
      }

      queue.push(neighbor);
    }
  }

  return null;
}

/**
 * Calculate the shortest distance (number of edges) between two nodes.
 *
 * This equals the movement cost in War Banners.
 * Returns -1 if no path exists.
 */
export function getDistance(
  definition: BoardDefinition,
  source: string,
  target: string,
): number {
  const path = findShortestPath(definition, source, target);
  return path === null ? -1 : path.length - 1;
}

/**
 * Get all distances from a source node to every other node on the board.
 *
 * Returns a map of node ID → distance. Unreachable nodes are omitted.
 */
export function getAllDistances(
  definition: BoardDefinition,
  source: string,
): Map<string, number> {
  const distances = new Map<string, number>();
  distances.set(source, 0);

  const queue: Array<{ nodeId: string; distance: number }> = [
    { nodeId: source, distance: 0 },
  ];

  while (queue.length > 0) {
    const { nodeId, distance } = queue.shift()!;

    for (const neighbor of definition.nodes[nodeId].connections) {
      if (distances.has(neighbor)) continue;
      distances.set(neighbor, distance + 1);
      queue.push({ nodeId: neighbor, distance: distance + 1 });
    }
  }

  return distances;
}

/**
 * Find the nearest node of a given set from a source node.
 *
 * Returns the node ID and distance of the closest target, or null if none reachable.
 */
export function findNearest(
  definition: BoardDefinition,
  source: string,
  targetIds: readonly string[],
): { nodeId: string; distance: number } | null {
  const targetSet = new Set(targetIds);
  if (targetSet.has(source)) return { nodeId: source, distance: 0 };

  const visited = new Set<string>([source]);
  const queue: Array<{ nodeId: string; distance: number }> = [
    { nodeId: source, distance: 0 },
  ];

  while (queue.length > 0) {
    const { nodeId, distance } = queue.shift()!;

    for (const neighbor of definition.nodes[nodeId].connections) {
      if (visited.has(neighbor)) continue;
      visited.add(neighbor);

      if (targetSet.has(neighbor)) {
        return { nodeId: neighbor, distance: distance + 1 };
      }

      queue.push({ nodeId: neighbor, distance: distance + 1 });
    }
  }

  return null;
}

/**
 * Get all nodes within a given distance from a source node.
 *
 * Useful for determining which nodes a Fellowship can reach with a given
 * number of War Banners.
 */
export function getNodesWithinDistance(
  definition: BoardDefinition,
  source: string,
  maxDistance: number,
): string[] {
  const result: string[] = [source];
  const visited = new Set<string>([source]);
  const queue: Array<{ nodeId: string; distance: number }> = [
    { nodeId: source, distance: 0 },
  ];

  while (queue.length > 0) {
    const { nodeId, distance } = queue.shift()!;
    if (distance >= maxDistance) continue;

    for (const neighbor of definition.nodes[nodeId].connections) {
      if (visited.has(neighbor)) continue;
      visited.add(neighbor);
      result.push(neighbor);
      queue.push({ nodeId: neighbor, distance: distance + 1 });
    }
  }

  return result;
}
