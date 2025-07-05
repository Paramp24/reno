import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Switch, ScrollView, Alert } from 'react-native';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../App';

const CustomButton = ({ title, onPress, style, selected }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[
      styles.choiceButton,
      selected ? styles.choiceButtonSelected : {},
      style,
    ]}
  >
    <Text style={[styles.choiceButtonText, selected ? { color: '#fff' } : {}]}>{title}</Text>
  </TouchableOpacity>
);

const BusinessProfileScreen = () => {
    const navigation = useNavigation();
    const { userToken } = useContext(AuthContext);
    const [isBusinessOwner, setIsBusinessOwner] = useState(false);
    const [businessName, setBusinessName] = useState('');
    const [industry, setIndustry] = useState([]);
    const [services, setServices] = useState([]);
    const [industryChoices, setIndustryChoices] = useState([]);
    const [servicesChoices, setServicesChoices] = useState([]);
    const [industrySearch, setIndustrySearch] = useState('');
    const [servicesSearch, setServicesSearch] = useState('');

    useEffect(() => {
        const fetchChoices = async () => {
            try {
                const res = await axios.get('http://127.0.0.1:8000/api/choices/');
                setIndustryChoices(res.data.industry || []);
                setServicesChoices(res.data.services || []);
            } catch (err) {
                console.log('Failed to fetch choices:', err);
            }
        };
        fetchChoices();
    }, []);

    const toggleIndustry = (choice) => {
        setIndustry((prev) =>
            prev.includes(choice) ? prev.filter((item) => item !== choice) : [...prev, choice]
        );
    };

    const toggleService = (choice) => {
        setServices((prev) =>
            prev.includes(choice) ? prev.filter((item) => item !== choice) : [...prev, choice]
        );
    };

    const handleSave = async () => {
        if (isBusinessOwner && !businessName.trim()) {
            Alert.alert('Input required', 'Please enter your business name.');
            return;
        }
        try {
            await axios.post('http://127.0.0.1:8000/api/update-business-info/', {
                is_business_owner: isBusinessOwner,
                business_name: isBusinessOwner ? businessName : '',
                industry: isBusinessOwner ? industry : [],
                services: isBusinessOwner ? services : [],
            }, {
                headers: { Authorization: `Token ${userToken}` }
            });
            navigation.navigate('Home');
        } catch (err) {
            Alert.alert('Update Failed', 'Could not save your profile. Please try again.');
        }
    };
    
    const handleSkip = () => {
        navigation.navigate('Home');
    };

    const removeIndustry = (choice) => {
        setIndustry((prev) => prev.filter((item) => item !== choice));
    };
    const removeService = (choice) => {
        setServices((prev) => prev.filter((item) => item !== choice));
    };

    const filteredIndustryChoices = industryChoices.filter(choice => choice.toLowerCase().includes(industrySearch.toLowerCase()));
    const filteredServicesChoices = servicesChoices.filter(choice => choice.toLowerCase().includes(servicesSearch.toLowerCase()));

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Complete Your Profile</Text>
            <Text>This information will be displayed publicly.</Text>
            
            <View style={styles.switchRow}>
                <Text>Are you a business owner?</Text>
                <Switch value={isBusinessOwner} onValueChange={setIsBusinessOwner} />
            </View>

            {isBusinessOwner && (
                <>
                    <TextInput
                        style={styles.input}
                        placeholder="Business Name"
                        value={businessName}
                        onChangeText={setBusinessName}
                    />
                    
                    <Text style={styles.header}>Industry</Text>
                    <TextInput style={styles.input} placeholder="Search Industry" value={industrySearch} onChangeText={setIndustrySearch} />
                    <View style={styles.choicesRow}>
                        {filteredIndustryChoices.map((choice) => (
                            <CustomButton key={choice} title={choice} onPress={() => toggleIndustry(choice)} selected={industry.includes(choice)} />
                        ))}
                    </View>
                    <View style={styles.selectedChipsRow}>
                        {industry.map(item => (
                            <View key={item} style={styles.chip}>
                                <Text style={styles.chipText}>{item}</Text>
                                <TouchableOpacity onPress={() => removeIndustry(item)}><Text style={styles.chipRemove}>x</Text></TouchableOpacity>
                            </View>
                        ))}
                    </View>

                    <Text style={styles.header}>Services</Text>
                    <TextInput style={styles.input} placeholder="Search Services" value={servicesSearch} onChangeText={setServicesSearch} />
                    <View style={styles.choicesRow}>
                        {filteredServicesChoices.map((choice) => (
                            <CustomButton key={choice} title={choice} onPress={() => toggleService(choice)} selected={services.includes(choice)} />
                        ))}
                    </View>
                    <View style={styles.selectedChipsRow}>
                        {services.map(item => (
                            <View key={item} style={styles.chip}>
                                <Text style={styles.chipText}>{item}</Text>
                                <TouchableOpacity onPress={() => removeService(item)}><Text style={styles.chipRemove}>x</Text></TouchableOpacity>
                            </View>
                        ))}
                    </View>
                </>
            )}

            <TouchableOpacity style={styles.button} onPress={handleSave}>
                <Text style={styles.buttonText}>Save and Continue</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.skipButton]} onPress={handleSkip}>
                <Text style={styles.buttonText}>Skip for Now</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
    input: { width: '100%', borderWidth: 1, borderColor: '#ccc', padding: 10, marginVertical: 10, borderRadius: 5 },
    header: { fontWeight: 'bold', marginTop: 20, marginBottom: 5, alignSelf: 'flex-start' },
    button: { backgroundColor: '#007bff', padding: 15, borderRadius: 5, marginVertical: 5, width: '100%', alignItems: 'center' },
    skipButton: { backgroundColor: 'grey' },
    buttonText: { color: '#fff', fontWeight: 'bold' },
    switchRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, justifyContent: 'space-between', width: '100%' },
    choicesRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginVertical: 5 },
    choiceButton: { backgroundColor: '#f0f0f0', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, margin: 4, borderWidth: 1, borderColor: '#ccc' },
    choiceButtonSelected: { backgroundColor: '#007bff', borderColor: '#007bff' },
    choiceButtonText: { color: '#333', fontWeight: 'bold' },
    selectedChipsRow: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: 4, justifyContent: 'flex-start', width: '100%' },
    chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e0e0e0', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4, margin: 2 },
    chipText: { fontSize: 14, color: '#333', marginRight: 4 },
    chipRemove: { color: '#888', fontWeight: 'bold', fontSize: 16, marginLeft: 2, paddingHorizontal: 2 },
});

export default BusinessProfileScreen;
