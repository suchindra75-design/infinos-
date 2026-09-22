import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import '../../core/networking/api_client.dart';
import '../../core/networking/api_exception.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../models/device.dart';

typedef FileSaver = Future<String?> Function(
  String filename,
  Uint8List bytes,
  String mimeType,
);

Future<String?> defaultFileSaver(
  String filename,
  Uint8List bytes,
  String mimeType,
) async {
  try {
    final tempDir = await getTemporaryDirectory();
    final file = File('${tempDir.path}/$filename');
    await file.writeAsBytes(bytes);

    try {
      final xFile = XFile(file.path, mimeType: mimeType);
      // ignore: deprecated_member_use
      await Share.shareXFiles([xFile], text: 'INFINOS Export: $filename');
    } catch (_) {
      // Graceful fallback for non-UI/headless/test environments
    }
    return file.path;
  } catch (e) {
    throw Exception('Failed to save file: $e');
  }
}

class ExportModal extends StatefulWidget {
  final SafeDevice device;
  final ApiClient apiClient;
  final FileSaver? fileSaver;

  const ExportModal({
    super.key,
    required this.device,
    required this.apiClient,
    this.fileSaver,
  });

  @override
  State<ExportModal> createState() => _ExportModalState();
}

class _ExportModalState extends State<ExportModal> {
  String _exportType = 'csv'; // 'csv' or 'pdf'
  String _rangeMode = 'all'; // 'all' or 'custom'
  DateTime? _fromDate;
  DateTime? _toDate;

  bool _isExporting = false;
  String? _error;
  String? _success;

  String _formatDateDisplay(DateTime? dt) {
    if (dt == null) return 'Select Date';
    return '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')}';
  }

  String _extractFilename(http.Response response, String defaultFilename) {
    final cd = response.headers['content-disposition'];
    if (cd != null) {
      final match = RegExp(r'filename="?([^";\n]+)"?').firstMatch(cd);
      if (match != null && match.group(1) != null) {
        return match.group(1)!;
      }
    }
    return defaultFilename;
  }

  Future<void> _selectDate(BuildContext context, bool isFrom) async {
    final initialDate = isFrom
        ? (_fromDate ?? DateTime.now().subtract(const Duration(days: 7)))
        : (_toDate ?? DateTime.now());
    final picked = await showDatePicker(
      context: context,
      initialDate: initialDate,
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: AppColors.primaryOrange,
              onPrimary: Colors.white,
              surface: AppColors.surface,
              onSurface: AppColors.primaryText,
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      setState(() {
        if (isFrom) {
          _fromDate = picked;
        } else {
          _toDate = picked;
        }
        _error = null;
      });
    }
  }

  Future<void> _handleExport() async {
    setState(() {
      _error = null;
      _success = null;
    });

    if (_rangeMode == 'custom') {
      if (_fromDate == null && _toDate == null) {
        setState(() {
          _error = 'Select at least one date for custom range, or choose All History.';
        });
        return;
      }
      if (_fromDate != null && _toDate != null && _fromDate!.isAfter(_toDate!)) {
        setState(() {
          _error = "'From' date must be earlier than or equal to 'To' date.";
        });
        return;
      }
    }

    setState(() {
      _isExporting = true;
    });

    try {
      final Map<String, String> queryParams = {};
      if (_rangeMode == 'custom') {
        if (_fromDate != null) {
          final start = DateTime(_fromDate!.year, _fromDate!.month, _fromDate!.day, 0, 0, 0);
          queryParams['from'] = start.toUtc().toIso8601String();
        }
        if (_toDate != null) {
          final end = DateTime(_toDate!.year, _toDate!.month, _toDate!.day, 23, 59, 59, 999);
          queryParams['to'] = end.toUtc().toIso8601String();
        }
      }

      final endpoint = '/devices/${widget.device.id}/export/$_exportType';
      final response = await widget.apiClient.getBytes(endpoint, queryParameters: queryParams);

      final defaultFilename =
          'infinos-bag-${widget.device.deviceCode}-${_exportType == 'csv' ? 'telemetry.csv' : 'report.pdf'}';
      final filename = _extractFilename(response, defaultFilename);
      final mimeType = _exportType == 'csv' ? 'text/csv' : 'application/pdf';

      final saver = widget.fileSaver ?? defaultFileSaver;
      await saver(filename, response.bodyBytes, mimeType);

      if (mounted) {
        setState(() {
          _success = '${_exportType.toUpperCase()} exported successfully.';
        });
      }
    } catch (err) {
      if (mounted) {
        setState(() {
          if (err is ApiException) {
            _error = err.message;
          } else {
            _error = err.toString().replaceAll(RegExp(r'^Exception:\s*'), '');
          }
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isExporting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      backgroundColor: AppColors.warmCream,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 420),
        child: Padding(
          padding: const EdgeInsets.all(20.0),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppColors.primaryOrange.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(
                        Icons.download_rounded,
                        color: AppColors.primaryOrange,
                        size: 22,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Audit Sensor Export',
                            style: AppTypography.displayHeader(fontSize: 16),
                          ),
                          const SizedBox(height: 2),
                          Row(
                            children: [
                              Text(
                                'Bag Code: ',
                                style: AppTypography.body(
                                  fontSize: 12,
                                  color: AppColors.mutedText,
                                ),
                              ),
                              Text(
                                widget.device.deviceCode,
                                style: AppTypography.mono(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.primaryOrange,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, size: 20),
                      onPressed: _isExporting ? null : () => Navigator.of(context).pop(),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Error alert
                if (_error != null) ...[
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFDC2626).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFDC2626).withValues(alpha: 0.3)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.error_outline_rounded, color: Color(0xFFDC2626), size: 18),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _error!,
                            style: AppTypography.body(fontSize: 12, color: const Color(0xFFDC2626)),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                ],

                // Success alert
                if (_success != null) ...[
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFF16A34A).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFF16A34A).withValues(alpha: 0.3)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.check_circle_outline_rounded, color: Color(0xFF16A34A), size: 18),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _success!,
                            style: AppTypography.body(fontSize: 12, color: const Color(0xFF16A34A)),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                ],

                // Format selection
                Text(
                  'REPORT FORMAT',
                  style: AppTypography.body(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: AppColors.mutedText,
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: _FormatOptionCard(
                        title: 'CSV Data',
                        subtitle: 'Spreadsheet format',
                        icon: Icons.table_chart_outlined,
                        iconColor: const Color(0xFF16A34A),
                        isSelected: _exportType == 'csv',
                        onTap: () => setState(() => _exportType = 'csv'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _FormatOptionCard(
                        title: 'PDF Report',
                        subtitle: 'Audit document',
                        icon: Icons.picture_as_pdf_outlined,
                        iconColor: const Color(0xFFDC2626),
                        isSelected: _exportType == 'pdf',
                        onTap: () => setState(() => _exportType = 'pdf'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Range mode
                Text(
                  'DATE RANGE',
                  style: AppTypography.body(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: AppColors.mutedText,
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: _RangeOptionButton(
                        label: 'All History',
                        isSelected: _rangeMode == 'all',
                        onTap: () => setState(() {
                          _rangeMode = 'all';
                          _fromDate = null;
                          _toDate = null;
                          _error = null;
                        }),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _RangeOptionButton(
                        label: 'Custom Range',
                        isSelected: _rangeMode == 'custom',
                        onTap: () => setState(() {
                          _rangeMode = 'custom';
                          _error = null;
                        }),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Date pickers (if custom range)
                if (_rangeMode == 'custom') ...[
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'FROM DATE',
                              style: AppTypography.body(
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                                color: AppColors.mutedText,
                              ),
                            ),
                            const SizedBox(height: 4),
                            InkWell(
                              onTap: () => _selectDate(context, true),
                              borderRadius: BorderRadius.circular(8),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                                decoration: BoxDecoration(
                                  color: AppColors.surface,
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: AppColors.border),
                                ),
                                child: Row(
                                  children: [
                                    const Icon(Icons.calendar_today_rounded, size: 14, color: AppColors.mutedText),
                                    const SizedBox(width: 6),
                                    Expanded(
                                      child: Text(
                                        _formatDateDisplay(_fromDate),
                                        style: AppTypography.mono(
                                          fontSize: 11,
                                          color: _fromDate != null ? AppColors.primaryText : AppColors.mutedText,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'TO DATE',
                              style: AppTypography.body(
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                                color: AppColors.mutedText,
                              ),
                            ),
                            const SizedBox(height: 4),
                            InkWell(
                              onTap: () => _selectDate(context, false),
                              borderRadius: BorderRadius.circular(8),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                                decoration: BoxDecoration(
                                  color: AppColors.surface,
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: AppColors.border),
                                ),
                                child: Row(
                                  children: [
                                    const Icon(Icons.calendar_today_rounded, size: 14, color: AppColors.mutedText),
                                    const SizedBox(width: 6),
                                    Expanded(
                                      child: Text(
                                        _formatDateDisplay(_toDate),
                                        style: AppTypography.mono(
                                          fontSize: 11,
                                          color: _toDate != null ? AppColors.primaryText : AppColors.mutedText,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                ],

                Text(
                  _rangeMode == 'all'
                      ? 'All History exports every sensor reading for this device.'
                      : 'Custom range is inclusive: From 00:00:00 to To 23:59:59 local time.',
                  style: AppTypography.body(
                    fontSize: 10,
                    color: AppColors.mutedText,
                  ).copyWith(fontStyle: FontStyle.italic),
                ),
                const SizedBox(height: 20),

                // Actions
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton(
                      onPressed: _isExporting ? null : () => Navigator.of(context).pop(),
                      style: TextButton.styleFrom(
                        foregroundColor: AppColors.mutedText,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      ),
                      child: const Text('Cancel'),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton(
                      onPressed: _isExporting ? null : _handleExport,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primaryOrange,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        elevation: 0,
                      ),
                      child: _isExporting
                          ? Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const SizedBox(
                                  width: 14,
                                  height: 14,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  'Generating...',
                                  style: AppTypography.title(fontSize: 13, color: Colors.white),
                                ),
                              ],
                            )
                          : Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.download_rounded, size: 16),
                                const SizedBox(width: 6),
                                Text(
                                  'Download ${_exportType.toUpperCase()}',
                                  style: AppTypography.title(fontSize: 13, color: Colors.white),
                                ),
                              ],
                            ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _FormatOptionCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final Color iconColor;
  final bool isSelected;
  final VoidCallback onTap;

  const _FormatOptionCard({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.iconColor,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final borderColor = isSelected ? AppColors.primaryOrange : AppColors.border;
    final bgColor = isSelected ? AppColors.primaryOrange.withValues(alpha: 0.08) : AppColors.surface;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: borderColor, width: isSelected ? 1.5 : 1),
        ),
        child: Row(
          children: [
            Icon(icon, color: iconColor, size: 22),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: AppTypography.body(fontSize: 12, fontWeight: FontWeight.w700),
                  ),
                  Text(
                    subtitle,
                    style: AppTypography.body(fontSize: 10, color: AppColors.mutedText),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RangeOptionButton extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _RangeOptionButton({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primaryOrange : AppColors.surface,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: isSelected ? AppColors.primaryOrange : AppColors.border),
        ),
        child: Text(
          label,
          style: AppTypography.body(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: isSelected ? Colors.white : AppColors.primaryText,
          ),
        ),
      ),
    );
  }
}
