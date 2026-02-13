import 'package:dobook/app/dobook_app.dart';
import 'package:dobook/data/dobook_repository.dart';
import 'package:flutter/material.dart';

class DobookBootstrap extends StatefulWidget {
  const DobookBootstrap({super.key});

  @override
  State<DobookBootstrap> createState() => _DobookBootstrapState();
}

class _DobookBootstrapState extends State<DobookBootstrap> {
  late final Future<DobookRepository> _repoFuture;

  @override
  void initState() {
    super.initState();
    _repoFuture = DobookRepository.open();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder(
      future: _repoFuture,
      builder: (context, snapshot) {
        final repo = snapshot.data;
        if (repo == null) {
          return MaterialApp(
            home: Scaffold(
              body: Center(
                child: snapshot.hasError
                    ? Text('Failed to start: ${snapshot.error}')
                    : const CircularProgressIndicator(),
              ),
            ),
          );
        }
        return DobookApp(repo: repo);
      },
    );
  }
}
