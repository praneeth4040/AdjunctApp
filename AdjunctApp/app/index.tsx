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
      <Link href={'/Login'}>Login</Link>
      <Text>ADJUNCT APP CHECKPOINT.</Text>
        <Link href="/onboard" style={{color:'blue',fontSize:20,fontWeight:'bold'  }}>Onboard</Link>
        <Link href="/otp" style={{color:'blue',fontSize:20,fontWeight:'bold'}}>otp </Link>
        <Link href="/permissions">Permissions</Link>
        <Link href='/profileSetup'>Profile Setup</Link>
    </View>
  );
}
