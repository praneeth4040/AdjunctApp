import { Link } from "expo-router";
import { Text, View,StyleSheet } from "react-native";

const style = StyleSheet.create({
  container:{
    flex:1,
    backgroundColor:'#ffffff',
    alignItems:'center',
    justifyContent:'center',

  }
})
export default function Index() {
  return (
    <View style={style.container}>
      <Text>Edit app/index.tsx to edit this screen.</Text>
      <Link href={'./Login'}>Login</Link>
    </View>
  );
}
