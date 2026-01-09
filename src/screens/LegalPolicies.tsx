import { 
  View, 
  Text, 
  Pressable, 
  ScrollView, 
  StatusBar,
  Linking
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useToast } from 'react-native-toast-notifications';


type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;


interface LegalDocument {
  id: string;
  title: string;
  url?: string; 
  type: 'external' | 'internal';
}

export default function LegalPolicies() {
   const toast = useToast();

  const navigation = useNavigation<ScreenNavigationProp>();


  const handleOpenDocument = async (url: string, title: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      
      if (canOpen) {
        await Linking.openURL(url);
      } else {
      toast.show('Could not open ${title}', { type: 'danger' });

       
      }
    } catch (error) {
      console.error(`Error opening ${title}:`, error);
     
      toast.show('Could not open ${title}', { type: 'danger' });
    }
  };

  
  const handleNavigateToScreen = (screen: keyof RootStackParamList) => {
        toast.show('coming soonn!!!', { type: 'normal' });

  };

  const handleDocumentPress = (doc: LegalDocument) => {
    // if (doc.type === 'external' && doc.url) {
    //   handleOpenDocument(doc.url, doc.title);
    // } else if (doc.type === 'internal' && doc.screen) {
    //   handleNavigateToScreen(doc.screen);
    // }
  };

  const legalDocuments: LegalDocument[] = [
    {
      id: 'terms',
      title: 'Terms of Service',
      url: 'https://orderlystores.com/terms', 
      type: 'external'
    },
    {
      id: 'privacy',
      title: 'Privacy Policy',
      url: 'https://orderlystores.com/privacy', 
      type: 'external'
    },
    {
      id: 'merchant',
      title: 'Merchant Agreement',
      url: 'https://orderlystores.com/merchant-agreement', 
      type: 'external'
    },
    {
      id: 'licenses',
      title: 'Third-party Licenses',
    //   screen: 'ThirdPartyLicenses' as any, 
      type: 'internal'
    }
  ];

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View className="bg-white flex-row items-center px-4 py-3 border-b border-gray-200">
        <Pressable className="mr-3" onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#000" />
        </Pressable>
        <Text className="text-lg font-medium text-gray-900">Legal & Policies</Text>
      </View>

      <ScrollView className="flex-1">
        <View className="mx-4 mt-4 mb-4 bg-white rounded-2xl shadow-sm overflow-hidden">
          {legalDocuments.map((doc, index) => (
            <Pressable
              key={doc.id}
              onPress={() => handleDocumentPress(doc)}
              className={`flex-row items-center justify-between px-4 py-4 ${
                index !== legalDocuments.length - 1 ? 'border-b border-gray-100' : ''
              }`}
              android_ripple={{ color: '#f3f4f6' }}
            >
              <Text className="flex-1 text-base text-gray-900">
                {doc.title}
              </Text>

              {doc.type === 'external' ? (
                <MaterialIcons 
                  name="open-in-new" 
                  size={20} 
                  color="#9ca3af" 
                />
              ) : (
                <MaterialIcons 
                  name="chevron-right" 
                  size={24} 
                  color="#9ca3af" 
                />
              )}
            </Pressable>
          ))}
        </View>

        <View className="px-4 pb-6">
          <Text className="text-center text-xs text-gray-400">
            © 2026 Orderly Store Inc. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}