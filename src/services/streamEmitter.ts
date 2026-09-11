type StreamData = {
  thought: string;
  text: string;
  isGenerating: boolean;
};

type StreamCallback = (data: StreamData) => void;

class StreamEmitter {
  private listeners: Set<StreamCallback> = new Set();
  private currentThought = "";
  private currentText = "";
  private isGenerating = false;
  private lastNotifyTime = 0;
  private notifyTimeout: any = null;

  public subscribe(callback: StreamCallback) {
    this.listeners.add(callback);
    // Gửi ngay dữ liệu hiện tại
    callback({
      thought: this.currentThought,
      text: this.currentText,
      isGenerating: this.isGenerating,
    });
    return () => {
      this.listeners.delete(callback);
    };
  }

  public emitStart() {
    this.currentThought = "";
    this.currentText = "";
    this.isGenerating = true;
    this.notify(true);
  }

  public emitProgress(thought: string, text: string) {
    this.currentThought = thought;
    this.currentText = text;
    this.notify();
  }

  public emitEnd() {
    this.isGenerating = false;
    this.notify(true);
  }

  public getRawData() {
    return {
      thought: this.currentThought,
      text: this.currentText,
      isGenerating: this.isGenerating,
      combined: this.currentThought
        ? this.currentThought + "\n\n" + this.currentText
        : this.currentText,
    };
  }

  private notify(force = false) {
    const now = Date.now();
    if (!force && now - this.lastNotifyTime < 100) {
      if (!this.notifyTimeout) {
        this.notifyTimeout = setTimeout(() => {
          this.notifyTimeout = null;
          this.notify(true);
        }, 100);
      }
      return;
    }
    this.lastNotifyTime = now;
    if (this.notifyTimeout) {
      clearTimeout(this.notifyTimeout);
      this.notifyTimeout = null;
    }

    const data: StreamData = {
      thought: this.currentThought,
      text: this.currentText,
      isGenerating: this.isGenerating,
    };

    this.listeners.forEach((listener) => {
      try {
        listener(data);
      } catch (e) {
        console.error("[StreamEmitter] Error in listener:", e);
      }
    });
  }
}

export const streamEmitter = new StreamEmitter();
