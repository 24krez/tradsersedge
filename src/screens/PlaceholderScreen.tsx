import { StyleSheet, Text, View } from 'react-native';

export function PlaceholderScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mission Setup</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#101415',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: '800',
  },
});
