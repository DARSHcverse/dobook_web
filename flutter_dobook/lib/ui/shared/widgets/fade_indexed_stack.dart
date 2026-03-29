import 'package:flutter/material.dart';

class FadeIndexedStack extends StatefulWidget {
  const FadeIndexedStack({
    super.key,
    required this.index,
    required this.children,
    this.duration = const Duration(milliseconds: 250),
  });

  final int index;
  final List<Widget> children;
  final Duration duration;

  @override
  State<FadeIndexedStack> createState() => _FadeIndexedStackState();
}

class _FadeIndexedStackState extends State<FadeIndexedStack>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  int _previousIndex = 0;

  @override
  void initState() {
    super.initState();
    _previousIndex = widget.index;
    _controller = AnimationController(vsync: this, duration: widget.duration)
      ..value = 1;
  }

  @override
  void didUpdateWidget(covariant FadeIndexedStack oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.index != widget.index) {
      _previousIndex = oldWidget.index;
      _controller.forward(from: 0);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: List.generate(widget.children.length, (i) {
        final isActive = i == widget.index;
        final isPrevious = i == _previousIndex && _previousIndex != widget.index;
        final animation = isActive
            ? _controller
            : isPrevious
                ? ReverseAnimation(_controller)
                : const AlwaysStoppedAnimation(0.0);

        return IgnorePointer(
          ignoring: !isActive,
          child: FadeTransition(
            opacity: animation,
            child: TickerMode(
              enabled: isActive,
              child: widget.children[i],
            ),
          ),
        );
      }),
    );
  }
}
