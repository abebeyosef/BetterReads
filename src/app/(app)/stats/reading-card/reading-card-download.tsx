"use client";

export function ReadingCardDownload() {
  async function download() {
    const el = document.getElementById("reading-card");
    if (!el) return;

    try {
      // Dynamically import html2canvas to avoid SSR issues
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(el, { useCORS: true, scale: 2 });
      const link = document.createElement("a");
      link.download = "reading-card.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      alert("Could not generate image. Try right-clicking the card to save it.");
    }
  }

  return (
    <button
      onClick={download}
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
    >
      Download as image
    </button>
  );
}
