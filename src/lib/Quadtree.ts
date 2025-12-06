/**
 * Quadtree implementation for spatial partitioning
 * Optimizes particle-to-particle and particle-to-point queries
 */

export interface Point {
  x: number;
  y: number;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class Quadtree<T extends Point> {
  private boundary: Rectangle;
  private capacity: number;
  private points: T[];
  private divided: boolean;
  private northeast?: Quadtree<T>;
  private northwest?: Quadtree<T>;
  private southeast?: Quadtree<T>;
  private southwest?: Quadtree<T>;

  constructor(boundary: Rectangle, capacity: number = 4) {
    this.boundary = boundary;
    this.capacity = capacity;
    this.points = [];
    this.divided = false;
  }

  /**
   * Check if a point is within the boundary
   */
  private contains(point: Point): boolean {
    return (
      point.x >= this.boundary.x &&
      point.x < this.boundary.x + this.boundary.width &&
      point.y >= this.boundary.y &&
      point.y < this.boundary.y + this.boundary.height
    );
  }

  /**
   * Check if a rectangle intersects with the boundary
   */
  private intersects(range: Rectangle): boolean {
    return !(
      range.x > this.boundary.x + this.boundary.width ||
      range.x + range.width < this.boundary.x ||
      range.y > this.boundary.y + this.boundary.height ||
      range.y + range.height < this.boundary.y
    );
  }

  /**
   * Subdivide the quadtree into four quadrants
   */
  private subdivide(): void {
    const x = this.boundary.x;
    const y = this.boundary.y;
    const w = this.boundary.width / 2;
    const h = this.boundary.height / 2;

    this.northeast = new Quadtree({ x: x + w, y, width: w, height: h }, this.capacity);
    this.northwest = new Quadtree({ x, y, width: w, height: h }, this.capacity);
    this.southeast = new Quadtree({ x: x + w, y: y + h, width: w, height: h }, this.capacity);
    this.southwest = new Quadtree({ x, y: y + h, width: w, height: h }, this.capacity);

    this.divided = true;
  }

  /**
   * Insert a point into the quadtree
   */
  insert(point: T): boolean {
    if (!this.contains(point)) {
      return false;
    }

    if (this.points.length < this.capacity) {
      this.points.push(point);
      return true;
    }

    if (!this.divided) {
      this.subdivide();
    }

    return (
      this.northeast!.insert(point) ||
      this.northwest!.insert(point) ||
      this.southeast!.insert(point) ||
      this.southwest!.insert(point)
    );
  }

  /**
   * Query all points within a given range
   */
  query(range: Rectangle, found: T[] = []): T[] {
    if (!this.intersects(range)) {
      return found;
    }

    for (const point of this.points) {
      if (
        point.x >= range.x &&
        point.x < range.x + range.width &&
        point.y >= range.y &&
        point.y < range.y + range.height
      ) {
        found.push(point);
      }
    }

    if (this.divided) {
      this.northeast!.query(range, found);
      this.northwest!.query(range, found);
      this.southeast!.query(range, found);
      this.southwest!.query(range, found);
    }

    return found;
  }

  /**
   * Query points within a circular range
   */
  queryCircle(center: Point, radius: number, found: T[] = []): T[] {
    // First query a square range for efficiency
    const range: Rectangle = {
      x: center.x - radius,
      y: center.y - radius,
      width: radius * 2,
      height: radius * 2,
    };

    const candidates = this.query(range);
    const radiusSquared = radius * radius;

    // Filter to only points within the circle
    for (const point of candidates) {
      const dx = point.x - center.x;
      const dy = point.y - center.y;
      if (dx * dx + dy * dy <= radiusSquared) {
        found.push(point);
      }
    }

    return found;
  }

  /**
   * Clear all points from the quadtree
   */
  clear(): void {
    this.points = [];
    this.divided = false;
    this.northeast = undefined;
    this.northwest = undefined;
    this.southeast = undefined;
    this.southwest = undefined;
  }
}
