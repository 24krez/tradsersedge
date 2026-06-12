import ActivityKit
import MyModule
import WidgetKit
import SwiftUI

@main
struct TraderEdgeWidgets: WidgetBundle {
    var body: some Widget {
        TraderEdgeLiveActivity()
    }
}

struct TraderEdgeLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: TraderEdgeAttributes.self) { context in
            // Lock Screen & Banner UI
            LockScreenView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded UI
                DynamicIslandExpandedRegion(.leading) {
                    HStack {
                        Image(systemName: "lock.shield.fill")
                            .foregroundColor(getStatusColor(context.state.status))
                        Text(context.state.timeRemaining)
                            .font(.system(.body, design: .monospaced))
                            .fontWeight(.medium)
                    }
                    .padding(.leading, 8)
                }
                
                DynamicIslandExpandedRegion(.trailing) {
                    Text(getStatusLabel(context.state.status))
                        .font(.caption)
                        .fontWeight(.bold)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(getStatusColor(context.state.status).opacity(0.2))
                        .foregroundColor(getStatusColor(context.state.status))
                        .cornerRadius(4) // Minimal corner radius as per design spec, sharp preferred but 4px softens the island edges
                        .padding(.trailing, 8)
                }
                
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("ACTIVE OBJECTIVE")
                            .font(.system(size: 10, weight: .bold, design: .monospaced))
                            .foregroundColor(.gray)
                        Text(context.state.objective)
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(.white)
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 8)
                }
            } compactLeading: {
                Image(systemName: "lock.shield.fill")
                    .foregroundColor(getStatusColor(context.state.status))
            } compactTrailing: {
                Text(context.state.timeRemaining)
                    .font(.system(.caption2, design: .monospaced))
                    .foregroundColor(.white)
            } minimal: {
                Image(systemName: "lock.shield.fill")
                    .foregroundColor(getStatusColor(context.state.status))
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Lock Screen View
// ---------------------------------------------------------------------------

struct LockScreenView: View {
    let context: ActivityViewContext<TraderEdgeAttributes>
    
    var body: some View {
        VStack(spacing: 0) {
            // Header Row
            HStack {
                HStack(spacing: 6) {
                    Circle()
                        .fill(getStatusColor(context.state.status))
                        .frame(width: 8, height: 8)
                    
                    Text("SESSION LIVE")
                        .font(.system(size: 11, weight: .bold, design: .monospaced))
                        .foregroundColor(.gray)
                }
                
                Spacer()
                
                Text(getStatusLabel(context.state.status))
                    .font(.system(size: 11, weight: .bold, design: .monospaced))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(getStatusColor(context.state.status).opacity(0.15))
                    .foregroundColor(getStatusColor(context.state.status))
            }
            .padding(.bottom, 12)
            
            // Objective Row
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("PRIMARY OBJECTIVE")
                        .font(.system(size: 10, weight: .bold, design: .monospaced))
                        .foregroundColor(Color(hex: "9a8f80")) // outline variant
                    
                    Text(context.state.objective.uppercased())
                        .font(.system(size: 16, weight: .bold, design: .default))
                        .foregroundColor(.white)
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 4) {
                    Text("TIME")
                        .font(.system(size: 10, weight: .bold, design: .monospaced))
                        .foregroundColor(.gray)
                    
                    Text(context.state.timeRemaining)
                        .font(.system(size: 16, weight: .bold, design: .monospaced))
                        .foregroundColor(.white)
                }
            }
        }
        .padding(16)
        .background(Color(hex: "0A192F")) // Secondary from DESIGN.md
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func getStatusColor(_ status: String) -> Color {
    switch status {
    case "locked_in":
        return Color(hex: "C5A059") // Gold
    case "on_track":
        return Color(hex: "C5A059").opacity(0.8) // Desaturated Gold
    case "caution":
        return Color.orange
    case "high_risk":
        return Color(hex: "ffb4ab") // Error color from design
    default:
        return Color(hex: "C5A059")
    }
}

func getStatusLabel(_ status: String) -> String {
    switch status {
    case "locked_in": return "LOCKED IN"
    case "on_track": return "ON TRACK"
    case "caution": return "CAUTION"
    case "high_risk": return "HIGH RISK"
    default: return status.uppercased()
    }
}

// Simple Hex Color extension
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
