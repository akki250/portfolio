import React, { useEffect, useState } from 'react';
import { X, Sparkles, Sliders, Copy, Check, Eye, Waves } from 'lucide-react';
import { useVisualContext } from '../contexts/VisualContext';
import { RAW_SHADER_SOURCES } from './visual/ShaderController';
import { ShaderModeId } from './visual/shaderEngineLogic';

interface ShaderStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShaderStudioModal: React.FC<ShaderStudioModalProps> = ({ isOpen, onClose }) => {
  const {
    activeShader,
    autoSyncRoute,
    shaderIntensity,
    isShaderPaused,
    constellationOverlayEnabled,
    presets,
    modes,
    setShaderMode,
    setAutoSyncRoute,
    setShaderIntensity,
    setIsShaderPaused,
    setConstellationOverlayEnabled,
    triggerShaderRipple,
  } = useVisualContext();

  const [inspectedShader, setInspectedShader] = useState<ShaderModeId>(
    (activeShader as ShaderModeId) || 'aurora'
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && activeShader) {
      setInspectedShader(activeShader as ShaderModeId);
    }
  }, [isOpen, activeShader]);

  if (!isOpen) return null;

  const glslSource =
    (RAW_SHADER_SOURCES as Record<string, string>)[inspectedShader] ||
    RAW_SHADER_SOURCES.aurora;

  const handleCopyGlsl = async () => {
    try {
      await navigator.clipboard.writeText(glslSource);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shader-studio-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/80"
      onClick={onClose}
    >
      <div
        className="cyber-card relative w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-violet-500/25 bg-[#060612]/95 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Sliders className="w-5 h-5 text-cyan-400 shrink-0" />
            <div className="min-w-0">
              <h2
                id="shader-studio-title"
                className="text-sm md:text-base font-semibold tracking-tight font-display text-white truncate"
              >
                WebGL Shader Engine Studio — 6 Live GLSL Experiences
              </h2>
              <p className="text-[11px] text-violet-200/75 truncate">
                Persistent Root Three.js WebGL Pipeline · Real-Time Uniform Interpolation · Zero-Flicker Transitions
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Shader Studio modal"
            className="cyber-control p-1.5 rounded text-zinc-300 hover:text-white transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 bg-[#04040c]/95">
          {/* Left Column: 6 Shader Preset Selector & Engine Controls */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <span className="text-xs font-mono uppercase tracking-wider text-cyan-300 whitespace-nowrap">
                  6 GLSL Shaders
                </span>
                <button
                  type="button"
                  onClick={() => setAutoSyncRoute(!autoSyncRoute)}
                  className={`px-2.5 py-1 text-[11px] font-mono rounded whitespace-nowrap shrink-0 ${
                    autoSyncRoute ? 'cyber-btn-yellow font-semibold' : 'cyber-control'
                  }`}
                >
                  {autoSyncRoute ? 'Auto Route Sync: ON' : 'Auto Route Sync: OFF'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(modes as ShaderModeId[]).map((modeId) => {
                  const preset = presets[modeId];
                  const isCurrent = activeShader === modeId;
                  return (
                    <button
                      key={modeId}
                      type="button"
                      onClick={() => {
                        setShaderMode(modeId, true);
                        setInspectedShader(modeId);
                      }}
                      className={`spring-interactive text-left p-2.5 rounded-xl border transition-all flex flex-col justify-between gap-1.5 ${
                        isCurrent
                          ? 'bg-violet-950/60 border-cyan-400/80 shadow-[0_0_18px_rgba(124,58,237,0.32)]'
                          : 'bg-[#0a0a1a]/80 border-violet-500/20 hover:border-violet-400/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5 w-full">
                        <span className="text-xs font-display font-semibold text-white truncate">
                          {preset.name}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <span
                            className="w-2 h-2 rounded-full border border-white/20"
                            style={{ backgroundColor: preset.primaryHex }}
                          />
                          <span
                            className="w-2 h-2 rounded-full border border-white/20"
                            style={{ backgroundColor: preset.accentHex }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-1 w-full">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-violet-500/20 text-cyan-300 truncate">
                          {modeId}.frag
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 truncate">
                          {preset.routeHint.split('·')[0]}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Uniform & Layer Controls */}
            <div className="p-3.5 rounded-xl bg-[#090918] border border-violet-500/25 space-y-2.5">
              <div className="flex items-center justify-between">
                <label htmlFor="shader-intensity-slider" className="text-xs font-mono text-slate-200">
                  uIntensity ({shaderIntensity.toFixed(2)})
                </label>
                <input
                  id="shader-intensity-slider"
                  type="range"
                  min="0.35"
                  max="2.0"
                  step="0.05"
                  value={shaderIntensity}
                  onChange={(e) => setShaderIntensity(parseFloat(e.target.value))}
                  className="w-32 accent-violet-500 cursor-pointer"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-violet-500/20">
                <button
                  type="button"
                  onClick={() => triggerShaderRipple(0.5, 0.5, 1.5)}
                  className="spring-interactive cyber-btn-yellow flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
                >
                  <Waves className="w-3.5 h-3.5" />
                  Pulse Energy Wave
                </button>

                <button
                  type="button"
                  onClick={() => setConstellationOverlayEnabled(!constellationOverlayEnabled)}
                  className="spring-interactive cyber-control flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono whitespace-nowrap"
                >
                  <Eye className="w-3.5 h-3.5 text-cyan-400" />
                  {constellationOverlayEnabled ? '3D Particles: ON' : 'Pure Shader'}
                </button>

                <button
                  type="button"
                  onClick={() => setIsShaderPaused(!isShaderPaused)}
                  className="spring-interactive cyber-control flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                  {isShaderPaused ? 'Resume GLSL' : 'Pause GLSL'}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Live GLSL Source Code Inspector */}
          <div className="lg:col-span-7 flex flex-col rounded-xl bg-[#05050e] border border-violet-500/25 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-violet-500/20 bg-[#090918] shrink-0">
              <span className="text-xs font-mono text-cyan-300 font-semibold truncate">
                src/components/visual/shaders/{inspectedShader}.frag
              </span>
              <button
                type="button"
                onClick={handleCopyGlsl}
                className="cyber-control px-2.5 py-1 text-xs font-mono flex items-center gap-1.5 shrink-0"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-cyan-300" />
                )}
                {copied ? 'Copied GLSL' : 'Copy .frag'}
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 max-h-[420px]">
              <pre className="text-[11px] font-mono leading-relaxed text-violet-100/90 select-all">
                <code>{glslSource}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
