export class FillQueue {
  private queue: string[] = [];

  /** Add a user to the queue if they're not already present */
  enqueue(userId: string): void {
    if (!this.queue.includes(userId)) {
      this.queue.push(userId);
    }
  }

  /** Remove a user from the queue */
  remove(userId: string): void {
    this.queue = this.queue.filter((id) => id !== userId);
  }

  /** Promote the first user in the queue (FIFO), returns the ID or undefined */
  promote(): string | undefined {
    return this.queue.shift();
  }

  /** Get the current queue as a list of user IDs */
  getAll(): string[] {
    return [...this.queue];
  }

  /** Get the size of the queue */
  size(): number {
    return this.queue.length;
  }

  /** Check if the queue contains a specific user */
  has(userId: string): boolean {
    return this.queue.includes(userId);
  }

  /** Peek at the first user in the queue without removing them */
  peek(): string | undefined {
    return this.queue[0];
  }

  /** Clear the queue */
  clear(): void {
    this.queue = [];
  }
}
