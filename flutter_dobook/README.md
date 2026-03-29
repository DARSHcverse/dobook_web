# DoBook (Flutter)

Mobile app for the DoBook booking system, integrated with the DoBook REST API.

## Backend API
By default, the app talks to:

```
https://www.do-book.com/api
```

You can override the API base URL with a Dart define at build/run time:

```
flutter run --dart-define=BASE_URL=https://your-domain.com/api
```

## Run
1. `flutter pub get`
2. `flutter run`
