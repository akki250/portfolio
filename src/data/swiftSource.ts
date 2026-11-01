export const SWIFT_PORTFOLIO_SOURCE = `//
//  PortfolioView.swift
//  DalaPortfolio — Interactive macOS Particle Constellation Portfolio
//
//  Targets: macOS 14.0+ (SwiftUI, AppKit NSHapticFeedbackManager, CoreGraphics)
//  Constraints: Zero external packages, Canvas batched by color & depth,
//  single adjustable PARTICLE_COUNT constant, locked 60–120fps.
//

import SwiftUI
import AppKit

// MARK: - 0. Adjustable Particle Constant
public let PARTICLE_COUNT: Int = 2200
private let DEPTH_BUCKETS: Int = 8

// MARK: - 1. Core Types & Keyframe Models
enum ConstellationShape: Int, CaseIterable, Identifiable {
    case brain = 0
    case name  = 1
    case chip  = 2
    case bulb  = 3
    case torus = 4

    var id: Int { rawValue }

    var title: String {
        switch self {
        case .brain: return "Brain"
        case .name:  return "Name"
        case .chip:  return "Chip"
        case .bulb:  return "Bulb"
        case .torus: return "Torus"
        }
    }
}

struct SIMDColor {
    var r: Double
    var g: Double
    var b: Double

    func lerp(to other: SIMDColor, t: Double) -> SIMDColor {
        SIMDColor(
            r: r + (other.r - r) * t,
            g: g + (other.g - g) * t,
            b: b + (other.b - b) * t
        )
    }

    var swiftUIColor: Color {
        Color(red: r, green: g, blue: b)
    }
}

struct TimelineKeyframe {
    let id: String
    let label: String
    let progress: Double
    let shape: ConstellationShape
    let offsetX: Double       // Normalized viewport width (-0.35 ... 0.35)
    let scale: Double
    let rotationY: Double
    let rotationX: Double
    let opacity: Double
    let accent: SIMDColor
    let bgTint: SIMDColor
}

struct ProjectCardItem: Identifiable {
    let id: String
    let title: String
    let subtitle: String
    let summary: String
    let year: String
    let metrics: String
    let relatedShape: ConstellationShape
    let accent: SIMDColor
}

struct ParticleState {
    var x: Double = 0
    var y: Double = 0
    var z: Double = 0
    var vx: Double = 0
    var vy: Double = 0
    var vz: Double = 0
    var morphDelay: Double = 0 // 0 ... 0.45 per-particle stagger
    var rainbowHue: Double = 0
    var baseSize: Double = 1.8
}

// MARK: - 2. Haptics Helper (macOS Trackpad)
enum TrackpadHaptics {
    static func alignment() {
        NSHapticFeedbackManager.defaultPerformer.perform(.alignment, performanceTime: .default)
    }
    static func levelChange() {
        NSHapticFeedbackManager.defaultPerformer.perform(.levelChange, performanceTime: .default)
    }
    static func generic() {
        NSHapticFeedbackManager.defaultPerformer.perform(.generic, performanceTime: .default)
    }
}

// MARK: - 3. Pure Math & Procedural 3D Shape Engine
enum ConstellationMath {
    static func clamp(_ v: Double, _ minV: Double, _ maxV: Double) -> Double {
        min(max(v, minV), maxV)
    }

    static func lerp(_ a: Double, _ b: Double, _ t: Double) -> Double {
        a + (b - a) * t
    }

    static func easeInOutCubic(_ t: Double) -> Double {
        let c = clamp(t, 0.0, 1.0)
        return c < 0.5 ? 4.0 * c * c * c : 1.0 - pow(-2.0 * c + 2.0, 3.0) / 2.0
    }

    static func particleMorphT(localProgress: Double, delay: Double) -> Double {
        let p = clamp(localProgress, 0.0, 1.0)
        let d = clamp(delay, 0.0, 0.45)
        let normalized = clamp((p - d) / (1.0 - d), 0.0, 1.0)
        return easeInOutCubic(normalized)
    }

    static func scrubTextMetrics(scrollProgress: Double, center: Double, hold: Double = 0.075, fade: Double = 0.085) -> (opacity: Double, offsetY: Double) {
        let delta = scrollProgress - center
        let absDelta = abs(delta)
        if absDelta <= hold {
            return (1.0, (delta / max(0.001, hold)) * -8.0)
        }
        if absDelta >= hold + fade {
            return (0.0, delta < 0 ? 54.0 : -54.0)
        }
        let fadeT = (absDelta - hold) / fade
        let alpha = easeInOutCubic(1.0 - fadeT)
        let dir: Double = delta < 0 ? 1.0 : -1.0
        return (alpha, dir * lerp(8.0, 54.0, fadeT))
    }

    // Reused Name-Shape & Type-to-Morph Bitmap Renderer using CoreGraphics
    static func generateTextPoints(_ text: String, count: Int = PARTICLE_COUNT) -> [SIMD3<Double>] {
        let clean = String(text.trimmingCharacters(in: .whitespacesAndNewlines).uppercased().prefix(12))
        let word = clean.isEmpty ? "AAKARSH" : clean
        let width = 320
        let height = 96

        guard let ctx = CGContext(
            data: nil,
            width: width,
            height: height,
            bitsPerComponent: 8,
            bytesPerRow: width,
            space: CGColorSpaceCreateDeviceGray(),
            bitmapInfo: CGImageAlphaInfo.none.rawValue
        ) else {
            return Array(repeating: .zero, count: count)
        }

        ctx.setFillColor(gray: 0, alpha: 1)
        ctx.fill(CGRect(x: 0, y: 0, width: width, height: height))

        let nsText = NSAttributedString(
            string: word,
            attributes: [
                .font: NSFont.systemFont(ofSize: 48, weight: .heavy),
                .foregroundColor: NSColor.white
            ]
        )
        let textSize = nsText.size()
        let drawOrigin = CGPoint(
            x: (CGFloat(width) - textSize.width) * 0.5,
            y: (CGFloat(height) - textSize.height) * 0.5
        )

        NSGraphicsContext.saveGraphicsState()
        NSGraphicsContext.current = NSGraphicsContext(cgContext: ctx, flipped: false)
        nsText.draw(at: drawOrigin)
        NSGraphicsContext.restoreGraphicsState()

        var activePixels: [(Double, Double)] = []
        if let buffer = ctx.data?.assumingMemoryBound(to: UInt8.self) {
            for py in stride(from: 0, to: height, by: 2) {
                for px in stride(from: 0, to: width, by: 2) {
                    if buffer[py * width + px] > 110 {
                        let nx = (Double(px) / Double(width) - 0.5) * 2.0
                        let ny = (Double(py) / Double(height) - 0.5) * 0.78
                        activePixels.append((nx, ny))
                    }
                }
            }
        }

        if activePixels.isEmpty {
            activePixels.append((0, 0))
        }

        var result: [SIMD3<Double>] = []
        result.reserveCapacity(count)
        let glyphBudget = Int(Double(count) * 0.88)

        for i in 0..<count {
            if i < glyphBudget {
                let sample = activePixels[(i * 73) % activePixels.count]
                let jx = Double((i * 17) % 100 - 50) * 0.00025
                let jy = Double((i * 31) % 100 - 50) * 0.00025
                let dz = Double((i * 47) % 100 - 50) * 0.0045
                result.append(SIMD3(sample.0 + jx, sample.1 + jy, dz))
            } else {
                let angle = Double(i) * 2.39996
                let r = 0.82 + Double(i % 100) * 0.005
                result.append(SIMD3(cos(angle) * r * 1.05, sin(angle) * r * 0.58, Double(i % 40 - 20) * 0.025))
            }
        }
        return result
    }

    static func generateCanonicalShape(_ shape: ConstellationShape, count: Int = PARTICLE_COUNT) -> [SIMD3<Double>] {
        switch shape {
        case .name:
            return generateTextPoints("AAKARSH", count: count)
        case .brain:
            return (0..<count).map { i in
                let t = Double(i) / Double(max(1, count))
                let u = Double((i * 197) % 1000) / 1000.0 * .pi * 2.0
                let v = acos(2.0 * t - 1.0)
                let folds = 0.08 * sin(u * 6.0 + cos(v * 5.0)) * sin(v * 7.0)
                let r = 0.84 + folds
                let hemi: Double = (i % 2 == 0) ? 1.0 : -1.0
                let rawX = r * sin(v) * cos(u) * 0.72
                let x = abs(rawX) * hemi + hemi * 0.14
                let y = r * cos(v) * 0.82 + 0.05
                let z = r * sin(v) * sin(u) * 1.08
                return SIMD3(x, y, z)
            }
        case .chip:
            return (0..<count).map { i in
                let ratio = Double(i) / Double(count)
                if ratio < 0.55 {
                    let gx = (Double((i * 37) % 100) / 100.0 - 0.5) * 1.15
                    let gz = (Double((i * 73) % 100) / 100.0 - 0.5) * 1.15
                    let qx = (gx * 8.0).rounded() / 8.0
                    let qz = (gz * 8.0).rounded() / 8.0
                    return SIMD3(qx, Double(i % 7 - 3) * 0.012, qz)
                } else {
                    let side = i % 4
                    let slot = Double((i / 4) % 14) / 13.0 - 0.5
                    let coord = slot * 1.6
                    let reach = 0.78 + Double(i % 25) * 0.018
                    let dropY = -max(0.0, reach - 0.98) * 0.55
                    switch side {
                    case 0: return SIMD3(coord, dropY, reach)
                    case 1: return SIMD3(coord, dropY, -reach)
                    case 2: return SIMD3(reach, dropY, coord)
                    default: return SIMD3(-reach, dropY, coord)
                    }
                }
            }
        case .bulb:
            return (0..<count).map { i in
                let ratio = Double(i) / Double(count)
                if ratio < 0.62 {
                    let s = ratio / 0.62
                    let y = 0.92 - s * 1.38
                    let theta = Double(i) * 2.39996
                    let r: Double
                    if y >= -0.05 {
                        let dy = (y - 0.22) / 0.75
                        r = sqrt(max(0.02, 1.0 - dy * dy)) * 0.78
                    } else {
                        let neck = (y + 0.05) / -0.41
                        r = 0.72 * (1.0 - neck * 0.52)
                    }
                    return SIMD3(cos(theta) * r, y, sin(theta) * r)
                } else if ratio < 0.82 {
                    let s = (ratio - 0.62) / 0.20
                    let arch = (s - 0.5) * .pi * 0.92
                    let coil = s * .pi * 26.0
                    return SIMD3(sin(arch) * 0.34 + sin(coil) * 0.04, -0.35 + cos(arch) * 0.68, cos(coil) * 0.04)
                } else {
                    let s = (ratio - 0.82) / 0.18
                    let y = -0.48 - s * 0.50
                    let theta = Double(i) * 2.39996
                    let r = 0.32 + 0.03 * sin(s * .pi * 10.0)
                    return SIMD3(cos(theta) * r, y, sin(theta) * r)
                }
            }
        case .torus:
            return (0..<count).map { i in
                let u = Double(i) / Double(count) * .pi * 2.0
                let v = Double((i * 61) % 360) * (.pi / 180.0)
                let majorR = 0.78
                let minorR = 0.30 + 0.06 * sin(3.0 * u + v * 2.0)
                let x = (majorR + minorR * cos(v)) * cos(u)
                let y = (majorR + minorR * cos(v)) * sin(u)
                let z = minorR * sin(v)
                return SIMD3(x, y, z)
            }
        }
    }
}

// MARK: - 4. Main Portfolio View
public struct PortfolioView: View {
    // Scrubbed timeline state (0 ... 1)
    @State private var targetScrollProgress: Double = 0.0
    @State private var scrollProgress: Double = 0.0
    @State private var scrollVelocity: Double = 0.0

    // Shape & Morph overrides
    @State private var shapeOverride: ConstellationShape? = nil
    @State private var hoverShapeOverride: ConstellationShape? = nil
    @State private var hoverAccentOverride: SIMDColor? = nil
    @State private var customTypedText: String = ""
    @State private var customTextPoints: [SIMD3<Double>] = []

    // Ripple & Burst waves
    @State private var rippleOrigin: CGPoint = .zero
    @State private var rippleRadius: Double = -1.0

    // Cursor & Force Field
    @State private var cursorLocation: CGPoint = CGPoint(x: -999, y: -999)
    @State private var isCursorInside: Bool = false
    @State private var isHoldingClick: Bool = false
    @State private var swirlMode: Bool = false

    // Drag Rotation & Zoom
    @State private var userRotationY: Double = 0.0
    @State private var userRotationX: Double = 0.0
    @State private var rotVelocityY: Double = 0.0
    @State private var rotVelocityX: Double = 0.0
    @State private var isDragging: Bool = false
    @State private var lastDragValue: CGSize = .zero
    @State private var zoomScale: Double = 1.0

    // Easter Eggs & Overlays
    @State private var isPaused: Bool = false
    @State private var rainbowTimer: Double = 0.0
    @State private var konamiBuffer: [String] = []
    @State private var showShortcutOverlay: Bool = false

    // Precomputed canonical shapes & live particles
    @State private var shapeCaches: [[SIMD3<Double>]] = []
    @State private var particles: [ParticleState] = []
    @State private var autoRotateAngle: Double = 0.0

    private let konamiSequence = ["UP", "UP", "DOWN", "DOWN", "LEFT", "RIGHT", "LEFT", "RIGHT", "B", "A"]

    private let keyframes: [TimelineKeyframe] = [
        TimelineKeyframe(id: "overview", label: "Overview", progress: 0.00, shape: .brain, offsetX: 0.22, scale: 1.05, rotationY: 0.25, rotationX: 0.15, opacity: 0.98, accent: SIMDColor(r: 0.00, g: 0.94, b: 1.00), bgTint: SIMDColor(r: 0.03, g: 0.04, b: 0.09)),
        TimelineKeyframe(id: "identity", label: "Experience", progress: 0.25, shape: .name,  offsetX: -0.22, scale: 0.90, rotationY: -0.14, rotationX: 0.06, opacity: 1.00, accent: SIMDColor(r: 0.99, g: 0.93, b: 0.04), bgTint: SIMDColor(r: 0.07, g: 0.05, b: 0.07)),
        TimelineKeyframe(id: "projects", label: "Projects", progress: 0.50, shape: .chip,  offsetX: 0.24, scale: 1.00, rotationY: 0.42, rotationX: 0.28, opacity: 0.96, accent: SIMDColor(r: 1.00, g: 0.16, b: 0.52), bgTint: SIMDColor(r: 0.09, g: 0.03, b: 0.10)),
        TimelineKeyframe(id: "lab",      label: "Skills & Lab", progress: 0.75, shape: .bulb,  offsetX: -0.22, scale: 1.08, rotationY: -0.35, rotationX: 0.12, opacity: 0.97, accent: SIMDColor(r: 0.00, g: 1.00, b: 0.62), bgTint: SIMDColor(r: 0.02, g: 0.07, b: 0.09)),
        TimelineKeyframe(id: "contact",  label: "Contact",  progress: 1.00, shape: .torus, offsetX: 0.18, scale: 1.15, rotationY: 0.65, rotationX: 0.35, opacity: 0.98, accent: SIMDColor(r: 0.72, g: 0.36, b: 1.00), bgTint: SIMDColor(r: 0.05, g: 0.03, b: 0.11))
    ]

    private let projects: [ProjectCardItem] = [
        ProjectCardItem(id: "recircuit", title: "ReCircuit", subtitle: "React 19 · FastAPI · MongoDB · Stripe", summary: "E-waste platform that classifies waste from photos and matches users with recyclers via a marketplace + INR Stripe Checkout.", year: "2026", metrics: "AI Classifier · Stripe INR", relatedShape: .torus, accent: SIMDColor(r: 0.20, g: 0.83, b: 0.60)),
        ProjectCardItem(id: "movemycar", title: "Move My Car", subtitle: "React · TS · Express · PostgreSQL · Twilio", summary: "Full-stack QR-code system enabling masked owner calling via Twilio without exposing phone numbers.", year: "2025", metrics: "Twilio Masked Call · Multi-QR", relatedShape: .bulb, accent: SIMDColor(r: 0.98, g: 0.75, b: 0.14)),
        ProjectCardItem(id: "landline", title: "Smart Landline Automation", subtitle: "ESP32 · C++ · Arduino · LDR · Servos", summary: "Detects flashing ring light with an LDR sensor and drives two servos to lift receiver, press #, and hang up.", year: "2025", metrics: "Non-Invasive LDR · Dual Servo", relatedShape: .chip, accent: SIMDColor(r: 0.22, g: 0.74, b: 0.97)),
        ProjectCardItem(id: "fire", title: "Automatic Fire Extinguisher", subtitle: "Arduino · C++ · Flame Sensors · Relay", summary: "Triangulates fire with two flame sensors, aims a servo nozzle, and triggers a relay-driven water pump.", year: "2025", metrics: "Dual Flame Sensor · Relay Pump", relatedShape: .bulb, accent: SIMDColor(r: 0.96, g: 0.25, b: 0.37)),
        ProjectCardItem(id: "esp32audio", title: "ESP32 Live Audio Streaming", subtitle: "ESP32 · I²S Mic · iPhone Stream", summary: "Consent-based, authenticated live audio streaming from an ESP32 mic to iPhone with physical mute switch and LED.", year: "WIP", metrics: "I²S Stream · Hardware Cut-Off", relatedShape: .brain, accent: SIMDColor(r: 0.65, g: 0.55, b: 0.98)),
        ProjectCardItem(id: "games", title: "Browser Games Suite", subtitle: "Beach Buggy · Wheelspin vs Wheelspin", summary: "Playable web arcade games built from scratch with custom 60fps physics and collision loops.", year: "2025", metrics: "60fps Canvas · Custom Physics", relatedShape: .torus, accent: SIMDColor(r: 0.22, g: 0.74, b: 0.97))
    ]

    public init() {}

    public var body: some View {
        GeometryReader { geo in
            ZStack {
                // 1. Scrubbed Background Tint Layer
                let interp = currentTimelineState()
                let activeAccent = hoverAccentOverride ?? interp.accent
                RadialGradient(
                    colors: [
                        interp.bgTint.swiftUIColor.opacity(0.95),
                        Color(red: 0.02, green: 0.02, blue: 0.03)
                    ],
                    center: .center,
                    startRadius: 40,
                    endRadius: max(geo.size.width, geo.size.height) * 0.85
                )
                .ignoresSafeArea()

                // 2. Custom Cursor Glow
                if isCursorInside {
                    Circle()
                        .fill(
                            RadialGradient(
                                colors: [
                                    activeAccent.swiftUIColor.opacity(isHoldingClick ? 0.32 : 0.16),
                                    activeAccent.swiftUIColor.opacity(0.0)
                                ],
                                center: .center,
                                startRadius: 2,
                                endRadius: isHoldingClick ? 110 : 180
                            )
                        )
                        .frame(width: 360, height: 360)
                        .position(cursorLocation)
                        .allowsHitTesting(false)
                }

                // 3. 60fps Batched Particle Canvas
                TimelineView(.animation) { timeline in
                    Canvas { context, size in
                        drawBatchedParticles(context: &context, size: size, accent: activeAccent)
                    }
                    .onChange(of: timeline.date) { _, _ in
                        stepPhysics(viewportSize: geo.size)
                    }
                }
                .contentShape(Rectangle())
                .onContinuousHover { phase in
                    switch phase {
                    case .active(let pt):
                        cursorLocation = pt
                        isCursorInside = true
                    case .ended:
                        isCursorInside = false
                    }
                }
                .gesture(
                    DragGesture(minimumDistance: 0)
                        .onChanged { value in
                            cursorLocation = value.location
                            let dist = hypot(value.translation.width, value.translation.height)
                            if dist > 6 {
                                isDragging = true
                                let dx = Double(value.translation.width - lastDragValue.width)
                                let dy = Double(value.translation.height - lastDragValue.height)
                                rotVelocityY = dx * 0.0085
                                rotVelocityX = dy * 0.0085
                                userRotationY += rotVelocityY
                                userRotationX = ConstellationMath.clamp(userRotationX + rotVelocityX, -1.2, 1.2)
                                lastDragValue = value.translation
                            } else if !isHoldingClick {
                                isHoldingClick = true
                                TrackpadHaptics.generic()
                            }
                        }
                        .onEnded { value in
                            let dist = hypot(value.translation.width, value.translation.height)
                            if isHoldingClick {
                                triggerOutwardBurst(at: value.location, viewportSize: geo.size)
                            }
                            if dist < 6 {
                                // Click on empty space -> cycle shape + outward ripple
                                cycleNextShapeWithRipple(at: value.location)
                            }
                            isHoldingClick = false
                            isDragging = false
                            lastDragValue = .zero
                        }
                )
                .gesture(
                    MagnifyGesture()
                        .onChanged { value in
                            zoomScale = ConstellationMath.clamp(Double(value.magnification), 0.55, 2.2)
                        }
                )

                // 4. Scrubbed Editorial Text & Project Overlay
                scrubbedContentOverlay(size: geo.size, accent: activeAccent)

                // 5. Top Navigation Bar & Type-to-Morph Field
                VStack {
                    topNavigationBar(accent: activeAccent)
                    Spacer()
                    bottomControlStrip(accent: activeAccent)
                }
                .padding(.horizontal, 28)
                .padding(.vertical, 20)

                // 6. Keyboard Shortcut Modal ("?")
                if showShortcutOverlay {
                    shortcutModalView(accent: activeAccent)
                }
            }
            .onAppear {
                bootstrapEngine()
                installEventMonitors()
            }
        }
    }

    // MARK: - Batched Canvas Drawing (Grouped by Depth & Color Bucket)
    private func drawBatchedParticles(context: inout GraphicsContext, size: CGSize, accent: SIMDColor) {
        guard !particles.isEmpty else { return }

        if rainbowTimer > 0 {
            let hueBuckets = 12
            var paths = Array(repeating: Path(), count: hueBuckets)
            for p in particles {
                let depthNorm = ConstellationMath.clamp((p.z + 1.5) / 3.0, 0.0, 1.0)
                let radius = p.baseSize * (0.55 + depthNorm * 0.95)
                let bucket = Int(p.rainbowHue * Double(hueBuckets)) % hueBuckets
                let rect = CGRect(x: p.x - radius, y: p.y - radius, width: radius * 2, height: radius * 2)
                paths[bucket].addEllipse(in: rect)
            }
            for b in 0..<hueBuckets {
                let hue = Double(b) / Double(hueBuckets)
                context.fill(paths[b], with: .color(Color(hue: hue, saturation: 0.88, brightness: 1.0)))
            }
            return
        }

        // Group into DEPTH_BUCKETS so Canvas executes only 8 draw calls per frame
        var bucketPaths = Array(repeating: Path(), count: DEPTH_BUCKETS)
        for p in particles {
            let depthNorm = ConstellationMath.clamp((p.z + 1.4) / 2.8, 0.0, 0.999)
            let bIdx = Int(depthNorm * Double(DEPTH_BUCKETS))
            let radius = p.baseSize * (0.52 + depthNorm * 0.92)
            let rect = CGRect(x: p.x - radius, y: p.y - radius, width: radius * 2, height: radius * 2)
            bucketPaths[bIdx].addEllipse(in: rect)
        }

        let interp = currentTimelineState()
        for b in 0..<DEPTH_BUCKETS {
            let t = Double(b) / Double(max(1, DEPTH_BUCKETS - 1))
            let alpha = (0.18 + t * 0.78) * interp.opacity
            let color = Color(
                red: ConstellationMath.lerp(accent.r * 0.65, min(1.0, accent.r + 0.22), t),
                green: ConstellationMath.lerp(accent.g * 0.65, min(1.0, accent.g + 0.22), t),
                blue: ConstellationMath.lerp(accent.b * 0.65, min(1.0, accent.b + 0.22), t),
                opacity: alpha
            )
            context.fill(bucketPaths[b], with: .color(color))
        }
    }

    // MARK: - 60fps Physics & Scrubbed Timeline Step
    private func stepPhysics(viewportSize: CGSize) {
        // 1. Smoothly lerp scrollProgress (0.08 factor per frame)
        let prevScroll = scrollProgress
        scrollProgress += (targetScrollProgress - scrollProgress) * 0.08
        let frameDelta = scrollProgress - prevScroll
        scrollVelocity = scrollVelocity * 0.86 + frameDelta * 18.0

        if isPaused { return }

        let interp = currentTimelineState()
        let speedBoost = 1.0 + min(4.5, abs(scrollVelocity) * 24.0)
        autoRotateAngle += 0.0045 * speedBoost

        if !isDragging {
            userRotationY += rotVelocityY
            userRotationX += rotVelocityX
            rotVelocityY *= 0.93
            rotVelocityX *= 0.93
            // Ease user rotation back toward 0 so auto-rotate blends seamlessly
            userRotationY *= 0.985
            userRotationX *= 0.985
        }

        if rainbowTimer > 0 {
            rainbowTimer = max(0.0, rainbowTimer - 0.016)
        }
        if rippleRadius >= 0 {
            rippleRadius += 22.0
            if rippleRadius > max(viewportSize.width, viewportSize.height) * 1.4 {
                rippleRadius = -1.0
            }
        }

        let totalRotY = interp.rotationY + autoRotateAngle + userRotationY
        let totalRotX = interp.rotationX + userRotationX
        let cosY = cos(totalRotY), sinY = sin(totalRotY)
        let cosX = cos(totalRotX), sinX = sin(totalRotX)

        let centerX = Double(viewportSize.width) * (0.5 + interp.offsetX)
        let centerY = Double(viewportSize.height) * 0.5
        let baseRadius = Double(min(viewportSize.width, viewportSize.height)) * 0.30 * interp.scale * zoomScale

        let pointsA = resolvePoints(for: interp.shapeA)
        let pointsB = resolvePoints(for: interp.shapeB)
        let scatter = min(0.55, abs(scrollVelocity) * 3.2)

        for i in 0..<particles.count {
            let pT = ConstellationMath.particleMorphT(localProgress: interp.localProgress, delay: particles[i].morphDelay)
            let a = pointsA[i]
            let b = pointsB[i]

            var lx = ConstellationMath.lerp(a.x, b.x, pT)
            var ly = ConstellationMath.lerp(a.y, b.y, pT) * (1.0 + scatter * 0.45)
            let lz = ConstellationMath.lerp(a.z, b.z, pT)

            if scatter > 0.005 {
                lx += sin(Double(i) * 1.7 + scrollProgress * 40.0) * scatter * 0.25
                ly += cos(Double(i) * 2.3 + scrollProgress * 40.0) * scatter * 0.25
            }

            // 3D Rotation
            let rx = lx * cosY - lz * sinY
            let rz1 = lx * sinY + lz * cosY
            let ry = ly * cosX - rz1 * sinX
            let rz = ly * sinX + rz1 * cosX

            let targetX = centerX + rx * baseRadius
            let targetY = centerY - ry * baseRadius

            // Spring toward target
            var vx = (particles[i].vx + (targetX - particles[i].x) * 0.095) * 0.82
            var vy = (particles[i].vy + (targetY - particles[i].y) * 0.095) * 0.82

            // Cursor Force Field (Repel / Swirl / Hold-to-Attract)
            if isCursorInside {
                let dx = particles[i].x - Double(cursorLocation.x)
                let dy = particles[i].y - Double(cursorLocation.y)
                let distSq = dx * dx + dy * dy
                let forceR = 165.0
                if distSq < forceR * forceR && distSq > 0.01 {
                    let dist = sqrt(distSq)
                    let falloff = pow(1.0 - dist / forceR, 2.0)
                    let nx = dx / dist
                    let ny = dy / dist
                    if isHoldingClick {
                        vx += (-nx * 3.4 - ny * 1.1) * falloff
                        vy += (-ny * 3.4 + nx * 1.1) * falloff
                    } else if swirlMode {
                        vx += (-ny * 2.8 + nx * 0.5) * falloff
                        vy += (nx * 2.8 + ny * 0.5) * falloff
                    } else {
                        vx += nx * 3.2 * falloff
                        vy += ny * 3.2 * falloff
                    }
                }
            }

            // Ripple Wave Impulse
            if rippleRadius >= 0 {
                let rdx = particles[i].x - Double(rippleOrigin.x)
                let rdy = particles[i].y - Double(rippleOrigin.y)
                let rDist = hypot(rdx, rdy)
                let band = abs(rDist - rippleRadius)
                if band < 48.0 && rDist > 0.1 {
                    let pulse = (1.0 - band / 48.0) * 4.2
                    vx += (rdx / rDist) * pulse
                    vy += (rdy / rDist) * pulse
                }
            }

            particles[i].vx = vx
            particles[i].vy = vy
            particles[i].x += vx
            particles[i].y += vy
            particles[i].z = rz
            particles[i].rainbowHue = (particles[i].rainbowHue + 0.008).truncatingRemainder(dividingBy: 1.0)
        }
    }

    // MARK: - Timeline Interpolation & Shape Helpers
    private struct InterpolatedTimeline {
        let shapeA: ConstellationShape
        let shapeB: ConstellationShape
        let localProgress: Double
        let offsetX: Double
        let scale: Double
        let rotationY: Double
        let rotationX: Double
        let opacity: Double
        let accent: SIMDColor
        let bgTint: SIMDColor
        let activeIndex: Int
    }

    private func currentTimelineState() -> InterpolatedTimeline {
        let p = ConstellationMath.clamp(scrollProgress, 0.0, 1.0)
        var idxA = 0
        for i in 0..<(keyframes.count - 1) {
            if p >= keyframes[i].progress && p <= keyframes[i + 1].progress {
                idxA = i
                break
            }
        }
        let idxB = min(idxA + 1, keyframes.count - 1)
        let kfA = keyframes[idxA]
        let kfB = keyframes[idxB]
        let span = max(0.0001, kfB.progress - kfA.progress)
        let local = ConstellationMath.clamp((p - kfA.progress) / span, 0.0, 1.0)
        let eased = ConstellationMath.easeInOutCubic(local)

        var closestIdx = 0
        var bestDist = Double.greatestFiniteMagnitude
        for i in 0..<keyframes.count {
            let d = abs(p - keyframes[i].progress)
            if d < bestDist {
                bestDist = d
                closestIdx = i
            }
        }

        let effectiveA = hoverShapeOverride ?? shapeOverride ?? kfA.shape
        let effectiveB = hoverShapeOverride ?? shapeOverride ?? kfB.shape

        return InterpolatedTimeline(
            shapeA: effectiveA,
            shapeB: effectiveB,
            localProgress: (hoverShapeOverride != nil || shapeOverride != nil) ? 1.0 : local,
            offsetX: customTypedText.isEmpty ? ConstellationMath.lerp(kfA.offsetX, kfB.offsetX, eased) : 0.0,
            scale: ConstellationMath.lerp(kfA.scale, kfB.scale, eased),
            rotationY: ConstellationMath.lerp(kfA.rotationY, kfB.rotationY, eased),
            rotationX: ConstellationMath.lerp(kfA.rotationX, kfB.rotationX, eased),
            opacity: ConstellationMath.lerp(kfA.opacity, kfB.opacity, eased),
            accent: kfA.accent.lerp(to: kfB.accent, t: eased),
            bgTint: kfA.bgTint.lerp(to: kfB.bgTint, t: eased),
            activeIndex: closestIdx
        )
    }

    private func resolvePoints(for shape: ConstellationShape) -> [SIMD3<Double>] {
        if !customTypedText.trimmingCharacters(in: .whitespaces).isEmpty && !customTextPoints.isEmpty {
            return customTextPoints
        }
        guard shape.rawValue < shapeCaches.count else {
            return Array(repeating: .zero, count: PARTICLE_COUNT)
        }
        return shapeCaches[shape.rawValue]
    }

    private func triggerOutwardBurst(at location: CGPoint, viewportSize: CGSize) {
        TrackpadHaptics.levelChange()
        for i in 0..<particles.count {
            let dx = particles[i].x - Double(location.x)
            let dy = particles[i].y - Double(location.y)
            let dist = max(1.0, hypot(dx, dy))
            let impulse = min(22.0, 480.0 / dist)
            particles[i].vx += (dx / dist) * impulse
            particles[i].vy += (dy / dist) * impulse
        }
    }

    private func cycleNextShapeWithRipple(at location: CGPoint) {
        let current = shapeOverride ?? currentTimelineState().shapeA
        let nextIndex = (current.rawValue + 1) % ConstellationShape.allCases.count
        shapeOverride = ConstellationShape(rawValue: nextIndex)
        customTypedText = ""
        rippleOrigin = location
        rippleRadius = 1.0
        TrackpadHaptics.alignment()
    }

    // MARK: - Scrubbed Text & Project Cards Overlay
    @ViewBuilder
    private func scrubbedContentOverlay(size: CGSize, accent: SIMDColor) -> some View {
        let s0 = ConstellationMath.scrubTextMetrics(scrollProgress: scrollProgress, center: 0.00)
        let s1 = ConstellationMath.scrubTextMetrics(scrollProgress: scrollProgress, center: 0.25)
        let s2 = ConstellationMath.scrubTextMetrics(scrollProgress: scrollProgress, center: 0.50)
        let s3 = ConstellationMath.scrubTextMetrics(scrollProgress: scrollProgress, center: 0.75)
        let s4 = ConstellationMath.scrubTextMetrics(scrollProgress: scrollProgress, center: 1.00)

        ZStack {
            // Stage 0: Overview
            if s0.opacity > 0.01 {
                HStack {
                    VStack(alignment: .leading, spacing: 14) {
                        Text("01 · B.TECH COMPUTER ENGINEERING · NMIMS MPSTME, NAVI MUMBAI")
                            .font(.system(size: 11, weight: .semibold, design: .monospaced))
                            .foregroundStyle(accent.swiftUIColor)
                        Text("Aakarsh Yadav")
                            .font(.system(size: 44, weight: .bold, design: .rounded))
                            .foregroundStyle(.white)
                        Text("Full-Stack Web & Embedded Hardware Engineer. Building React 19/FastAPI platforms, Twilio masked-calling QR systems, and ESP32/Arduino robotics.")
                            .font(.system(size: 15))
                            .foregroundStyle(.white.opacity(0.78))
                            .frame(maxWidth: 460, alignment: .leading)
                        Text("mr.aakarshyadav@gmail.com · +91 9607555095 · github.com/akki250 · linkedin.com/in/aakarsh-yadav")
                            .font(.system(size: 12, design: .monospaced))
                            .foregroundStyle(.white.opacity(0.6))
                    }
                    Spacer()
                }
                .padding(.horizontal, 56)
                .opacity(s0.opacity)
                .offset(y: s0.offsetY)
            }

            // Stage 1: Experience & Education
            if s1.opacity > 0.01 {
                HStack {
                    Spacer()
                    VStack(alignment: .leading, spacing: 14) {
                        Text("02 · EXPERIENCE & EDUCATION — IEEE STUDENT BRANCH")
                            .font(.system(size: 11, weight: .semibold, design: .monospaced))
                            .foregroundStyle(accent.swiftUIColor)
                        Text("IEEE MPSTME & Computer Engineering.")
                            .font(.system(size: 34, weight: .bold, design: .rounded))
                            .foregroundStyle(.white)
                        Text("• Web Development & Content Member, IEEE Student Branch (NMIMS MPSTME Navi Mumbai): Built and maintained the branch site; diagnosed a WordPress/Avada base64 SEO-spam compromise and rebuilt affected pages in clean custom HTML with a circuit-trace theme.\n• B.Tech Computer Engineering (1st Year), NMIMS MPSTME.")
                            .font(.system(size: 14))
                            .foregroundStyle(.white.opacity(0.78))
                            .frame(maxWidth: 460, alignment: .leading)
                    }
                }
                .padding(.horizontal, 56)
                .opacity(s1.opacity)
                .offset(y: s1.offsetY)
            }

            // Stage 2: Projects with Hover Shape & Tint Reactions
            if s2.opacity > 0.01 {
                HStack {
                    VStack(alignment: .leading, spacing: 14) {
                        Text("03 · FULL-STACK & EMBEDDED PROJECTS — HOVER TO MORPH")
                            .font(.system(size: 11, weight: .semibold, design: .monospaced))
                            .foregroundStyle(accent.swiftUIColor)
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                            ForEach(projects) { item in
                                VStack(alignment: .leading, spacing: 5) {
                                    HStack {
                                        Text(item.title)
                                            .font(.system(size: 15, weight: .bold))
                                            .foregroundStyle(.white)
                                        Spacer()
                                        Text(item.year)
                                            .font(.system(size: 11, design: .monospaced))
                                            .foregroundStyle(.white.opacity(0.5))
                                    }
                                    Text(item.summary)
                                        .font(.system(size: 11))
                                        .foregroundStyle(.white.opacity(0.72))
                                        .lineLimit(2)
                                    HStack {
                                        Text(item.metrics)
                                            .font(.system(size: 10, design: .monospaced))
                                            .foregroundStyle(.white.opacity(0.55))
                                        Spacer()
                                        Text("→ \\(item.relatedShape.title)")
                                            .font(.system(size: 10, weight: .semibold, design: .monospaced))
                                            .foregroundStyle(item.accent.swiftUIColor)
                                    }
                                }
                                .padding(12)
                                .background(Color.white.opacity(0.05))
                                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                                        .stroke(hoverShapeOverride == item.relatedShape ? item.accent.swiftUIColor : Color.white.opacity(0.1), lineWidth: 1)
                                )
                                .onHover { hovering in
                                    withAnimation(.spring(response: 0.32, dampingFraction: 0.78)) {
                                        hoverShapeOverride = hovering ? item.relatedShape : nil
                                        hoverAccentOverride = hovering ? item.accent : nil
                                    }
                                    if hovering { TrackpadHaptics.alignment() }
                                }
                            }
                        }
                        .frame(maxWidth: 580)
                    }
                    Spacer()
                }
                .padding(.horizontal, 56)
                .opacity(s2.opacity)
                .offset(y: s2.offsetY)
            }

            // Stage 3: Skills & Lab
            if s3.opacity > 0.01 {
                HStack {
                    Spacer()
                    VStack(alignment: .leading, spacing: 14) {
                        Text("04 · TECHNICAL STACK & CONSTELLATION LAB")
                            .font(.system(size: 11, weight: .semibold, design: .monospaced))
                            .foregroundStyle(accent.swiftUIColor)
                        Text("Python · TS/JS · C/C++ · React · FastAPI · ESP32")
                            .font(.system(size: 28, weight: .bold, design: .rounded))
                            .foregroundStyle(.white)
                            .frame(maxWidth: 460, alignment: .leading)
                        Text("Data: MongoDB, PostgreSQL · Hardware: ESP32, Arduino, I²S, LDR/Flame Sensors, Servos, Relays · Interests: Motorsports, Original poetry, Badminton.")
                            .font(.system(size: 14))
                            .foregroundStyle(.white.opacity(0.75))
                            .frame(maxWidth: 460, alignment: .leading)
                        HStack(spacing: 12) {
                            Button(swirlMode ? "Mode: Vortex Swirl" : "Mode: Radial Repel") {
                                withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                    swirlMode.toggle()
                                }
                                TrackpadHaptics.alignment()
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(accent.swiftUIColor)

                            Button("Konami Rainbow Burst") {
                                rainbowTimer = 4.0
                                triggerOutwardBurst(at: CGPoint(x: size.width * 0.5, y: size.height * 0.5), viewportSize: size)
                            }
                            .buttonStyle(.bordered)
                        }
                    }
                }
                .padding(.horizontal, 56)
                .opacity(s3.opacity)
                .offset(y: s3.offsetY)
            }

            // Stage 4: Contact
            if s4.opacity > 0.01 {
                HStack {
                    VStack(alignment: .leading, spacing: 14) {
                        Text("05 · DIRECT CONTACT")
                            .font(.system(size: 11, weight: .semibold, design: .monospaced))
                            .foregroundStyle(accent.swiftUIColor)
                        Text("Connect with Aakarsh Yadav.")
                            .font(.system(size: 38, weight: .bold, design: .rounded))
                            .foregroundStyle(.white)
                        Text("mr.aakarshyadav@gmail.com · +91 9607555095 · github.com/akki250 · linkedin.com/in/aakarsh-yadav")
                            .font(.system(size: 14, design: .monospaced))
                            .foregroundStyle(.white.opacity(0.78))
                            .frame(maxWidth: 520, alignment: .leading)
                        Button("Return to Origin (0%)") {
                            targetScrollProgress = 0.0
                            shapeOverride = nil
                            TrackpadHaptics.alignment()
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(accent.swiftUIColor)
                    }
                    Spacer()
                }
                .padding(.horizontal, 56)
                .opacity(s4.opacity)
                .offset(y: s4.offsetY)
            }
        }
    }

    // MARK: - Top Navigation & Bottom Controls
    private func topNavigationBar(accent: SIMDColor) -> some View {
        let activeIdx = currentTimelineState().activeIndex
        return HStack(spacing: 24) {
            Text("Aakarsh Yadav")
                .font(.system(size: 18, weight: .bold, design: .rounded))
                .foregroundStyle(.white)

            Spacer()

            HStack(spacing: 18) {
                ForEach(Array(keyframes.enumerated()), id: \\.element.id) { idx, kf in
                    Button {
                        withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
                            shapeOverride = nil
                            targetScrollProgress = kf.progress
                        }
                        TrackpadHaptics.alignment()
                    } label: {
                        Text(kf.label)
                            .font(.system(size: 13, weight: activeIdx == idx ? .semibold : .regular))
                            .foregroundStyle(activeIdx == idx ? .white : .white.opacity(0.55))
                            .padding(.vertical, 4)
                            .overlay(alignment: .bottom) {
                                if activeIdx == idx {
                                    Capsule()
                                        .fill(accent.swiftUIColor)
                                        .frame(height: 2)
                                }
                            }
                    }
                    .buttonStyle(.plain)
                }
            }

            Spacer()

            Button {
                withAnimation(.spring(response: 0.3, dampingFraction: 0.75)) {
                    showShortcutOverlay.toggle()
                }
                TrackpadHaptics.generic()
            } label: {
                Text("Shortcuts (?)")
                    .font(.system(size: 12, weight: .medium, design: .monospaced))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(Color.white.opacity(0.08))
                    .clipShape(Capsule())
            }
            .buttonStyle(.plain)
        }
    }

    private func bottomControlStrip(accent: SIMDColor) -> some View {
        HStack(spacing: 14) {
            TextField("Type to morph...", text: $customTypedText)
                .textFieldStyle(.plain)
                .font(.system(size: 12, design: .monospaced))
                .padding(.horizontal, 12)
                .padding(.vertical, 7)
                .frame(width: 190)
                .background(Color.white.opacity(0.07))
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .onChange(of: customTypedText) { _, newValue in
                    let trimmed = newValue.trimmingCharacters(in: .whitespaces)
                    if !trimmed.isEmpty {
                        customTextPoints = ConstellationMath.generateTextPoints(trimmed, count: PARTICLE_COUNT)
                        TrackpadHaptics.generic()
                    }
                }

            HStack(spacing: 6) {
                ForEach(ConstellationShape.allCases) { shape in
                    let isSelected = (shapeOverride ?? currentTimelineState().shapeA) == shape && customTypedText.isEmpty
                    Button {
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.72)) {
                            shapeOverride = shape
                            customTypedText = ""
                        }
                        TrackpadHaptics.alignment()
                    } label: {
                        Text("\\(shape.rawValue + 1).\\(shape.title)")
                            .font(.system(size: 11, weight: .medium, design: .monospaced))
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(isSelected ? Color.white : Color.white.opacity(0.07))
                            .foregroundStyle(isSelected ? Color.black : Color.white.opacity(0.8))
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                }
            }

            Spacer()

            Text("Timeline \\(Int((scrollProgress * 100).rounded()))%")
                .font(.system(size: 11, design: .monospaced))
                .foregroundStyle(.white.opacity(0.6))
        }
        .padding(12)
        .background(Color.black.opacity(0.65))
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private func shortcutModalView(accent: SIMDColor) -> some View {
        ZStack {
            Color.black.opacity(0.65)
                .ignoresSafeArea()
                .onTapGesture { showShortcutOverlay = false }

            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text("Keyboard & Trackpad Shortcuts")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(.white)
                    Spacer()
                    Button("Close") { showShortcutOverlay = false }
                        .buttonStyle(.plain)
                        .foregroundStyle(accent.swiftUIColor)
                }
                Divider().overlay(Color.white.opacity(0.12))
                Text("• Keys 1–5: Direct shape morph (Brain, Name, Chip, Bulb, Torus)")
                Text("• Arrow Up / Down: Scrub to previous / next timeline keyframe")
                Text("• Spacebar: Pause / resume 60fps simulation")
                Text("• Hold Click & Release: Attract cluster then burst outward")
                Text("• Konami Code (↑↑↓↓←→←→BA): Prismatic rainbow supernova")
            }
            .font(.system(size: 13, design: .monospaced))
            .foregroundStyle(.white.opacity(0.85))
            .padding(24)
            .frame(maxWidth: 460)
            .background(Color(red: 0.06, green: 0.06, blue: 0.09))
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        }
    }

    // MARK: - Bootstrap & Native Event Monitors
    private func bootstrapEngine() {
        guard particles.isEmpty else { return }
        shapeCaches = ConstellationShape.allCases.map {
            ConstellationMath.generateCanonicalShape($0, count: PARTICLE_COUNT)
        }
        let initialPoints = shapeCaches[0]
        particles = (0..<PARTICLE_COUNT).map { i in
            var p = ParticleState()
            p.x = initialPoints[i].x * 220.0 + 600.0
            p.y = initialPoints[i].y * 220.0 + 420.0
            p.z = initialPoints[i].z
            p.morphDelay = Double((i * 97) % 450) / 1000.0
            p.rainbowHue = Double(i) / Double(PARTICLE_COUNT)
            p.baseSize = 1.45 + Double(i % 5) * 0.22
            return p
        }
    }

    private func installEventMonitors() {
        NSEvent.addLocalMonitorForEvents(matching: .scrollWheel) { event in
            // Calibrated so 20 scroll gestures (0.0125 per gesture) advances one full transition (0.25 progress)
            let rawDelta = Double(event.scrollingDeltaY) * (event.hasPreciseScrollingDeltas ? 0.000125 : 0.00125)
            let step = ConstellationMath.clamp(rawDelta, -0.0125, 0.0125)
            shapeOverride = nil
            targetScrollProgress = ConstellationMath.clamp(targetScrollProgress - step, 0.0, 1.0)
            return event
        }

        NSEvent.addLocalMonitorForEvents(matching: .keyDown) { event in
            let chars = event.charactersIgnoringModifiers ?? ""
            let token: String
            switch event.keyCode {
            case 126: token = "UP"
            case 125: token = "DOWN"
            case 123: token = "LEFT"
            case 124: token = "RIGHT"
            default:  token = chars.uppercased()
            }

            konamiBuffer.append(token)
            if konamiBuffer.count > konamiSequence.count {
                konamiBuffer.removeFirst()
            }
            if konamiBuffer == konamiSequence {
                rainbowTimer = 4.2
                TrackpadHaptics.levelChange()
            }

            if chars >= "1" && chars <= "5", let idx = Int(chars), let shape = ConstellationShape(rawValue: idx - 1) {
                shapeOverride = shape
                customTypedText = ""
                TrackpadHaptics.alignment()
                return nil
            }
            if chars == " " {
                isPaused.toggle()
                TrackpadHaptics.generic()
                return nil
            }
            if chars == "?" || (event.modifierFlags.contains(.shift) && chars == "/") {
                showShortcutOverlay.toggle()
                TrackpadHaptics.generic()
                return nil
            }
            if event.keyCode == 125 || event.keyCode == 124 {
                let nextIdx = min(keyframes.count - 1, currentTimelineState().activeIndex + 1)
                targetScrollProgress = keyframes[nextIdx].progress
                shapeOverride = nil
                TrackpadHaptics.alignment()
                return nil
            }
            if event.keyCode == 126 || event.keyCode == 123 {
                let prevIdx = max(0, currentTimelineState().activeIndex - 1)
                targetScrollProgress = keyframes[prevIdx].progress
                shapeOverride = nil
                TrackpadHaptics.alignment()
                return nil
            }
            return event
        }
    }
}
`;

