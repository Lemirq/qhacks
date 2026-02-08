# Traffic Analytics System Guide

## Overview

The Traffic Analytics System provides comprehensive real-time monitoring and analysis of the traffic simulation. It tracks performance metrics, traffic patterns, safety events, and provides data export capabilities.

## Features

### 1. Debug Overlay (F3)
- **Toggle**: Press `F3` or click "Show/Hide Debug" button
- **Display**: Compact overlay in top-left corner
- **Metrics**:
  - Performance: FPS, frame time, update time, render time, memory usage
  - Traffic: Vehicle count, average speed, spawned/despawned counts
  - Vehicle Types: Count by sedan, SUV, truck, compact
  - Near Misses: Real-time safety alerts with severity levels

### 2. Analytics Dashboard
- **Access**: Click "Analytics Dashboard" button (bottom-right)
- **Tabs**:
  - **Overview**: Key metrics, FPS/vehicle charts, vehicle distribution
  - **Performance**: Detailed timing metrics with history charts
  - **Traffic**: Spawn/despawn stats, speed distribution
  - **Intersections**: Delay, queue length, crossing counts (when available)
  - **Safety**: Near-miss events categorized by severity

### 3. Data Export
- **CSV Export**: Click "Export CSV" in Analytics Dashboard
- **Includes**: All tracked metrics with timestamps
- **Columns**:
  - Timestamp, FPS, Frame/Update/Render times
  - Memory usage, vehicle counts, speeds
  - Vehicle type breakdown, near-miss counts

## Metrics Explained

### Performance Metrics
- **FPS**: Frames per second (target: 60)
  - Green: ≥55 FPS
  - Yellow: 30-54 FPS
  - Red: <30 FPS
- **Frame Time**: Total time per frame (target: <16.67ms for 60 FPS)
- **Update Time**: Time spent updating simulation logic
- **Render Time**: Time spent rendering the scene
- **Memory**: JavaScript heap memory usage (if available)

### Traffic Metrics
- **Vehicle Count**: Current number of active vehicles
- **Average Speed**: Mean speed of all vehicles (km/h)
- **Total Spawned**: Cumulative vehicles created since start
- **Total Despawned**: Cumulative vehicles removed
- **Vehicle Types**: Distribution across sedan/SUV/truck/compact

### Safety Metrics
- **Near Misses**: Detected when vehicles come within 5 meters
- **Severity Levels**:
  - High: <2 meters (40% of threshold)
  - Medium: 2-3.5 meters (40-70% of threshold)
  - Low: 3.5-5 meters (70-100% of threshold)

### Intersection Metrics (Future)
- **Average Delay**: Mean wait time at intersection
- **Queue Length**: Average number of waiting vehicles
- **Crossing Vehicles**: Total vehicles that passed through
- **Cycle Time**: Traffic light cycle duration

## Configuration

The analytics system can be configured in `ThreeMap.tsx`:

```typescript
analyticsRef.current = new TrafficAnalytics({
  enablePerformanceMonitoring: true,  // Track FPS, frame times
  enableTrafficMetrics: true,         // Track vehicle counts, speeds
  enableIntersectionTracking: true,   // Track intersection delays
  enableNearMissDetection: true,      // Detect safety events
  nearMissThreshold: 5,               // Distance in meters
  snapshotInterval: 1000,             // Snapshot frequency in ms
  maxHistoryLength: 300,              // Max snapshots to store (5 min at 1/sec)
});
```

## Integration Points

### In Animation Loop
1. **Frame Start**: `analytics.onFrameStart(timestamp)`
2. **Update Tracking**: `analytics.recordUpdateTime(time)`
3. **Render Tracking**: `analytics.recordRenderTime(time)`
4. **Frame Time**: `analytics.recordFrameTime(time)`
5. **Snapshot**: `analytics.createSnapshot(activeCars, timestamp)`

### Event Tracking
- **Spawn**: `analytics.trackSpawn()` when vehicle is created
- **Despawn**: `analytics.trackDespawn()` when vehicle is removed
- **Intersections**: `analytics.updateIntersection(id, position, delay, queueLength)`

## File Structure

```
lib/
  analytics.ts              # Core analytics engine
components/
  DebugOverlay.tsx          # F3 debug overlay component
  AnalyticsDashboard.tsx    # Full analytics dashboard
  ThreeMap.tsx              # Integration point
```

## Usage Tips

### For Debugging
1. Press F3 to show debug overlay
2. Monitor FPS to identify performance issues
3. Check update/render times to find bottlenecks
4. Watch near-misses for collision detection issues

### For Analysis
1. Open Analytics Dashboard
2. Switch to Performance tab to analyze timing
3. Check Traffic tab for spawn/despawn patterns
4. Review Safety tab for near-miss hotspots
5. Export CSV for external analysis

### For Development
1. Metrics update every 100ms in debug overlay
2. Dashboard updates every 500ms
3. Snapshots created every 1000ms (configurable)
4. History limited to 300 snapshots (5 minutes)

## CSV Export Format

The exported CSV includes the following columns:

```
Timestamp,FPS,Frame Time (ms),Update Time (ms),Render Time (ms),Memory (MB),
Vehicle Count,Avg Speed (km/h),Total Spawned,Total Despawned,
Sedans,SUVs,Trucks,Compacts,Near Misses
```

Example data analysis in Excel/Google Sheets:
- Create line chart for FPS over time
- Create bar chart for vehicle type distribution
- Calculate average speeds by time period
- Identify near-miss peaks

## Keyboard Shortcuts

- **F3**: Toggle debug overlay
- *(Dashboard has no keyboard shortcut - use button)*

## Performance Impact

The analytics system has minimal performance impact:
- ~0.1-0.3ms overhead per frame
- Efficient data structures (rolling arrays)
- Automatic history pruning
- Optional features can be disabled

## Troubleshooting

### Debug Overlay Not Showing
- Check that analytics is initialized (`analyticsRef.current` exists)
- Verify `debugOverlayVisible` state
- Press F3 to toggle

### Missing Metrics
- Ensure feature flags are enabled in config
- Check that spawner is initialized
- Verify animation loop is running

### Memory Issues
- Reduce `maxHistoryLength` in config
- Disable unused features
- Clear history periodically

## Future Enhancements

Planned features:
- [ ] Heatmap visualization for traffic density
- [ ] Route analysis and optimization
- [ ] Traffic light timing recommendations
- [ ] Accident prediction based on near-misses
- [ ] Real-time performance alerts
- [ ] Multi-session comparison
- [ ] Advanced filtering and search

## API Reference

See `/lib/analytics.ts` for complete API documentation and type definitions.
