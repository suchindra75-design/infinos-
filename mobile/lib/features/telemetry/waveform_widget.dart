import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../models/telemetry.dart';

enum WaveformState {
  ambient,
  liveUpdate,
  fieldTransition,
  alert,
}

class AnimatedWaveformWidget extends StatefulWidget {
  final ResolvedTelemetryField? activeField;
  final WaveformState waveformState;
  final bool hasActiveAlert;

  const AnimatedWaveformWidget({
    super.key,
    this.activeField,
    this.waveformState = WaveformState.ambient,
    this.hasActiveAlert = false,
  });

  @override
  State<AnimatedWaveformWidget> createState() => _AnimatedWaveformWidgetState();
}

class _AnimatedWaveformWidgetState extends State<AnimatedWaveformWidget>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Color _getPrimaryColor() {
    if (widget.hasActiveAlert || widget.waveformState == WaveformState.alert) {
      return Colors.red.shade600;
    }

    final field = widget.activeField;
    if (field == null) return AppColors.primaryOrange;

    final lowerLabel = field.label.toLowerCase();
    if (field.zone == 'cold' || (field.metric == 'temperature' && lowerLabel.contains('cold'))) {
      return AppColors.coldCompartment;
    }
    if (field.zone == 'hot' || (field.metric == 'temperature' && lowerLabel.contains('hot'))) {
      return AppColors.hotCompartment;
    }
    if (field.metric == 'humidity' || lowerLabel.contains('humid')) {
      return AppColors.relativeHumidity;
    }
    if (lowerLabel.contains('volt') || lowerLabel.contains('battery')) {
      return AppColors.batteryVoltage;
    }
    return AppColors.defaultMetric;
  }

  @override
  Widget build(BuildContext context) {
    final mediaQuery = MediaQuery.of(context);
    final isReducedMotion = mediaQuery.accessibleNavigation;

    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return CustomPaint(
          size: Size.infinite,
          painter: _WaveformPainter(
            progress: isReducedMotion ? 0.0 : _controller.value,
            color: _getPrimaryColor(),
            metricType: widget.activeField?.metric ?? 'temperature',
            state: widget.waveformState,
          ),
        );
      },
    );
  }
}

class _WaveformPainter extends CustomPainter {
  final double progress;
  final Color color;
  final String metricType;
  final WaveformState state;

  _WaveformPainter({
    required this.progress,
    required this.color,
    required this.metricType,
    required this.state,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (size.width <= 0 || size.height <= 0) return;

    final paint = Paint()
      ..strokeWidth = 2.0
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..color = color;

    final fillPaint = Paint()
      ..style = PaintingStyle.fill
      ..shader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [
          color.withValues(alpha: 0.18),
          color.withValues(alpha: 0.0),
        ],
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height));

    final path = Path();
    final fillPath = Path();

    final midY = size.height * 0.55;
    final waveLength = size.width * 0.6;
    final phase = progress * 2 * math.pi;

    double baseAmplitude = size.height * 0.22;
    if (metricType == 'humidity') {
      baseAmplitude *= 0.65;
    }

    if (state == WaveformState.alert) {
      baseAmplitude *= 1.4;
    } else if (state == WaveformState.liveUpdate) {
      baseAmplitude *= 1.15;
    }

    path.moveTo(0, midY);
    fillPath.moveTo(0, size.height);
    fillPath.lineTo(0, midY);

    for (double x = 0; x <= size.width; x += 3) {
      final normX = x / waveLength;
      final y = midY +
          baseAmplitude *
              math.sin(normX * 2 * math.pi - phase) *
              math.cos(normX * 0.5 * math.pi);

      path.lineTo(x, y);
      fillPath.lineTo(x, y);
    }

    fillPath.lineTo(size.width, size.height);
    fillPath.close();

    canvas.drawPath(fillPath, fillPaint);
    canvas.drawPath(path, paint);

    final secondaryPaint = Paint()
      ..strokeWidth = 1.0
      ..style = PaintingStyle.stroke
      ..color = color.withValues(alpha: 0.35);

    final secondaryPath = Path();
    secondaryPath.moveTo(0, midY);
    for (double x = 0; x <= size.width; x += 4) {
      final normX = x / (waveLength * 0.8);
      final y = midY +
          (baseAmplitude * 0.5) *
              math.sin(normX * 2 * math.pi - phase * 1.3);
      secondaryPath.lineTo(x, y);
    }
    canvas.drawPath(secondaryPath, secondaryPaint);
  }

  @override
  bool shouldRepaint(covariant _WaveformPainter oldDelegate) {
    return oldDelegate.progress != progress ||
        oldDelegate.color != color ||
        oldDelegate.state != state ||
        oldDelegate.metricType != metricType;
  }
}
