import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';

class AnalyticsChartWidget extends StatelessWidget {
  final List<double> points;
  final Color color;
  final String unit;
  final String fieldLabel;

  const AnalyticsChartWidget({
    super.key,
    required this.points,
    this.color = AppColors.primaryOrange,
    required this.unit,
    required this.fieldLabel,
  });

  @override
  Widget build(BuildContext context) {
    if (points.length < 2) {
      return Container(
        height: 140,
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.warmCream,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.border),
        ),
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.show_chart_rounded, size: 28, color: AppColors.mutedText),
              const SizedBox(height: 8),
              Text(
                'Insufficient timeseries records for $fieldLabel',
                style: AppTypography.body(fontSize: 12, color: AppColors.mutedText),
              ),
            ],
          ),
        ),
      );
    }

    final minVal = points.reduce(math.min);
    final maxVal = points.reduce(math.max);
    final avgVal = points.reduce((a, b) => a + b) / points.length;

    final mediaQuery = MediaQuery.of(context);
    final isReducedMotion = mediaQuery.accessibleNavigation;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.warmCream,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  '$fieldLabel Trend (${points.length} pts)',
                  style: AppTypography.title(fontSize: 13, fontWeight: FontWeight.w700),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 8),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'Min: ${minVal.toStringAsFixed(1)}$unit',
                    style: AppTypography.mono(fontSize: 10, color: AppColors.mutedText),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    'Avg: ${avgVal.toStringAsFixed(1)}$unit',
                    style: AppTypography.mono(fontSize: 10, color: AppColors.primaryOrange),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    'Max: ${maxVal.toStringAsFixed(1)}$unit',
                    style: AppTypography.mono(fontSize: 10, color: AppColors.mutedText),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 100,
            width: double.infinity,
            child: CustomPaint(
              size: Size.infinite,
              painter: _AnalyticsChartPainter(
                points: points,
                color: color,
                isReducedMotion: isReducedMotion,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _AnalyticsChartPainter extends CustomPainter {
  final List<double> points;
  final Color color;
  final bool isReducedMotion;

  _AnalyticsChartPainter({
    required this.points,
    required this.color,
    required this.isReducedMotion,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (size.width <= 0 || size.height <= 0 || points.isEmpty) return;

    final minVal = points.reduce(math.min);
    final maxVal = points.reduce(math.max);
    final range = maxVal - minVal == 0 ? 1.0 : maxVal - minVal;

    final paint = Paint()
      ..strokeWidth = 2.5
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..color = color;

    final fillPaint = Paint()
      ..style = PaintingStyle.fill
      ..shader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [
          color.withValues(alpha: 0.25),
          color.withValues(alpha: 0.0),
        ],
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height));

    final path = Path();
    final fillPath = Path();

    final stepX = size.width / (points.length - 1);
    final topPadding = size.height * 0.1;
    final bottomPadding = size.height * 0.1;
    final usableHeight = size.height - topPadding - bottomPadding;

    double getY(double val) {
      final norm = (val - minVal) / range;
      return size.height - bottomPadding - (norm * usableHeight);
    }

    path.moveTo(0, getY(points.first));
    fillPath.moveTo(0, size.height);
    fillPath.lineTo(0, getY(points.first));

    for (int i = 1; i < points.length; i++) {
      final x = i * stepX;
      final y = getY(points[i]);
      path.lineTo(x, y);
      fillPath.lineTo(x, y);
    }

    fillPath.lineTo(size.width, size.height);
    fillPath.close();

    canvas.drawPath(fillPath, fillPaint);
    canvas.drawPath(path, paint);

    // Draw endpoint dot
    final lastX = size.width;
    final lastY = getY(points.last);
    final dotPaint = Paint()
      ..style = PaintingStyle.fill
      ..color = color;
    final dotBorderPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0
      ..color = Colors.white;

    canvas.drawCircle(Offset(lastX, lastY), 4.5, dotPaint);
    canvas.drawCircle(Offset(lastX, lastY), 4.5, dotBorderPaint);
  }

  @override
  bool shouldRepaint(covariant _AnalyticsChartPainter oldDelegate) {
    return oldDelegate.points != points || oldDelegate.color != color;
  }
}
