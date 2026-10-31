import React, { useState } from 'react';
import { X, Copy, Check, Download, Code2 } from 'lucide-react';
import { SWIFT_PORTFOLIO_SOURCE } from '../data/swiftSource';

interface SwiftCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SwiftCodeModal: React.FC<SwiftCodeModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(SWIFT_PORTFOLIO_SOURCE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback copy
      const textarea = document.createElement('textarea');
      textarea.value = SWIFT_PORTFOLIO_SOURCE;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([SWIFT_PORTFOLIO_SOURCE], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'PortfolioView.swift';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="swift-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl h-[82vh] flex flex-col rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/90 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <Code2 className="w-5 h-5 text-sky-400" />
            <div>
              <h2 id="swift-modal-title" className="text-base font-semibold tracking-tight font-display">
                PortfolioView.swift — Native macOS SwiftUI Source
              </h2>
              <p className="text-xs text-zinc-400">
                Batched SwiftUI Canvas · TimelineView(.animation) · NSHapticFeedbackManager · CoreGraphics Glyph Sampler
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleCopy}
              className="spring-interactive flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-sky-500 text-zinc-950 hover:bg-sky-400 whitespace-nowrap"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied Full File' : 'Copy Swift File'}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="spring-interactive flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Download .swift
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close SwiftUI code modal"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6 bg-[#070709]">
          <pre className="text-xs font-mono leading-relaxed text-zinc-300 select-all">
            <code>{SWIFT_PORTFOLIO_SOURCE}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
