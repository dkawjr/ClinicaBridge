// ============================================================
// ClínicaBridge — content data
// Scenarios, drill sets, flashcard decks, pronunciation tips.
// All Spanish is neutral Latin-American clinical register (usted).
// ============================================================

const DRILL_SETS = [
  {
    id: "saludos",
    title: "Saludos y presentación",
    en: "Greetings & introductions",
    icon: "👋",
    phrases: [
      { es: "Buenos días, soy estudiante de medicina.", en: "Good morning, I'm a medical student." },
      { es: "Mucho gusto. ¿Cómo se llama usted?", en: "Nice to meet you. What is your name?" },
      { es: "¿Cómo prefiere que le llame?", en: "What do you prefer to be called?" },
      { es: "¿En qué puedo ayudarle hoy?", en: "How can I help you today?" },
      { es: "No se preocupe, estoy aquí para ayudarle.", en: "Don't worry, I'm here to help you." },
      { es: "¿Prefiere hablar en español o en inglés?", en: "Do you prefer to speak Spanish or English?" },
      { es: "Voy a hacerle algunas preguntas sobre su salud.", en: "I'm going to ask you some questions about your health." },
      { es: "Todo lo que me diga es confidencial.", en: "Everything you tell me is confidential." }
    ]
  },
  {
    id: "historia",
    title: "Historia clínica",
    en: "History taking (OLDCARTS)",
    icon: "📋",
    phrases: [
      { es: "¿Qué le trae hoy a la clínica?", en: "What brings you to the clinic today?" },
      { es: "¿Cuándo comenzó el dolor?", en: "When did the pain start?" },
      { es: "¿Dónde le duele exactamente?", en: "Where exactly does it hurt?" },
      { es: "¿El dolor se mueve hacia otra parte?", en: "Does the pain move anywhere else?" },
      { es: "¿El dolor es punzante, ardiente u opresivo?", en: "Is the pain stabbing, burning, or pressure-like?" },
      { es: "Del uno al diez, ¿qué tan fuerte es el dolor?", en: "From one to ten, how strong is the pain?" },
      { es: "¿Qué lo mejora y qué lo empeora?", en: "What makes it better and what makes it worse?" },
      { es: "¿Ha tenido esto antes?", en: "Have you had this before?" }
    ]
  },
  {
    id: "examen",
    title: "Examen físico",
    en: "Physical exam commands",
    icon: "🩺",
    phrases: [
      { es: "Voy a examinarle ahora, con su permiso.", en: "I'm going to examine you now, with your permission." },
      { es: "Respire profundo, por favor.", en: "Take a deep breath, please." },
      { es: "Sostenga la respiración.", en: "Hold your breath." },
      { es: "Abra la boca y diga «ah».", en: "Open your mouth and say 'ah'." },
      { es: "Siga mi dedo con los ojos, sin mover la cabeza.", en: "Follow my finger with your eyes, without moving your head." },
      { es: "Apriete mi mano lo más fuerte que pueda.", en: "Squeeze my hand as hard as you can." },
      { es: "Acuéstese boca arriba, por favor.", en: "Lie down on your back, please." },
      { es: "Avíseme si le duele cuando presiono.", en: "Let me know if it hurts when I press." }
    ]
  },
  {
    id: "medicamentos",
    title: "Medicamentos",
    en: "Medications & instructions",
    icon: "💊",
    phrases: [
      { es: "¿Qué medicamentos toma actualmente?", en: "What medications do you currently take?" },
      { es: "¿Es alérgico a algún medicamento?", en: "Are you allergic to any medication?" },
      { es: "Tome una pastilla dos veces al día, con comida.", en: "Take one pill twice a day, with food." },
      { es: "No deje de tomar el medicamento sin consultarnos.", en: "Don't stop taking the medication without consulting us." },
      { es: "Este medicamento puede causar mareo.", en: "This medication can cause dizziness." },
      { es: "¿Necesita que le repita las instrucciones?", en: "Do you need me to repeat the instructions?" },
      { es: "Vuelva en dos semanas para un control.", en: "Come back in two weeks for a check-up." },
      { es: "Llame si tiene fiebre o vómito.", en: "Call if you have fever or vomiting." }
    ]
  },
  {
    id: "urgencias",
    title: "Urgencias",
    en: "Emergency phrases",
    icon: "🚨",
    phrases: [
      { es: "¿Tiene dolor en el pecho ahora mismo?", en: "Do you have chest pain right now?" },
      { es: "¿Le falta el aire?", en: "Are you short of breath?" },
      { es: "Vamos a hacerle un electrocardiograma.", en: "We're going to do an electrocardiogram." },
      { es: "Necesitamos sacarle sangre para unos análisis.", en: "We need to draw blood for some tests." },
      { es: "Le vamos a poner suero por la vena.", en: "We're going to give you IV fluids." },
      { es: "¿Tiene mareos o náuseas?", en: "Do you have dizziness or nausea?" },
      { es: "Avise si el dolor cambia o empeora.", en: "Let us know if the pain changes or gets worse." },
      { es: "El médico viene en seguida.", en: "The doctor is coming right away." }
    ]
  },
  {
    id: "empatia",
    title: "Empatía y cierre",
    en: "Empathy & closing",
    icon: "🤝",
    phrases: [
      { es: "Entiendo que esto es difícil.", en: "I understand this is difficult." },
      { es: "Lamento mucho darle esta noticia.", en: "I'm very sorry to give you this news." },
      { es: "¿Tiene alguna pregunta para mí?", en: "Do you have any questions for me?" },
      { es: "¿Hay algo más que le preocupe?", en: "Is there anything else worrying you?" },
      { es: "Estamos aquí para acompañarle.", en: "We are here to support you." },
      { es: "Gracias por su confianza.", en: "Thank you for your trust." },
      { es: "Que se mejore pronto.", en: "Get well soon." },
      { es: "Nos vemos en la próxima cita.", en: "See you at the next appointment." }
    ]
  }
];

// Each scenario: patient persona + ordered steps.
// step = { patient:{es,en}, cue (EN, what YOU should do), target:{es,en}, alt:[...], vocab:[...] }
const SCENARIOS = [
  {
    id: "sala1",
    room: "01",
    title: "Dolor torácico",
    en: "Chest pain in the ED",
    setting: "Sala de urgencias",
    difficulty: 2,
    patient: { name: "Sr. Ramírez", age: 58, persona: "Llega sudoroso, con la mano en el pecho. Hipertenso, fumador.", voice: { pitch: 0.8, rate: 0.95 } },
    steps: [
      {
        patient: { es: "Ay, doctor… tengo un dolor muy fuerte en el pecho.", en: "Oh, doctor… I have very strong chest pain." },
        cue: "Express concern and ask when the pain started.",
        target: { es: "Lo siento mucho. ¿Cuándo comenzó el dolor?", en: "I'm so sorry. When did the pain start?" },
        alt: ["¿Cuándo empezó el dolor?", "Lo siento. ¿Cuándo empezó el dolor?"],
        vocab: ["dolor", "pecho", "comenzar"]
      },
      {
        patient: { es: "Empezó hace como dos horas, cuando subía las escaleras.", en: "It started about two hours ago, when I was climbing the stairs." },
        cue: "Ask where exactly it hurts and whether it radiates to the arm or jaw.",
        target: { es: "¿Dónde le duele exactamente? ¿El dolor se mueve hacia el brazo o la mandíbula?", en: "Where exactly does it hurt? Does the pain move to your arm or jaw?" },
        alt: ["¿Dónde le duele? ¿Se mueve el dolor al brazo o a la mandíbula?"],
        vocab: ["brazo", "mandíbula", "moverse"]
      },
      {
        patient: { es: "Aquí, en el centro del pecho… y se me va al brazo izquierdo.", en: "Here, in the center of my chest… and it goes to my left arm." },
        cue: "Ask him to rate the pain from one to ten.",
        target: { es: "Del uno al diez, ¿qué tan fuerte es el dolor?", en: "From one to ten, how strong is the pain?" },
        alt: ["En una escala del uno al diez, ¿qué tan fuerte es el dolor?"],
        vocab: ["escala", "fuerte"]
      },
      {
        patient: { es: "Como un ocho, doctor. Es como si algo me apretara.", en: "About an eight, doctor. It's like something is squeezing me." },
        cue: "Ask about shortness of breath, sweating, and nausea.",
        target: { es: "¿Le falta el aire? ¿Tiene sudoración o náuseas?", en: "Are you short of breath? Do you have sweating or nausea?" },
        alt: ["¿Le falta el aire? ¿Está sudando o tiene náuseas?"],
        vocab: ["falta de aire", "sudoración", "náuseas"]
      },
      {
        patient: { es: "Sí… estoy sudando mucho y me falta un poco el aire.", en: "Yes… I'm sweating a lot and I'm a little short of breath." },
        cue: "Ask about high blood pressure, diabetes, and smoking.",
        target: { es: "¿Tiene presión alta o diabetes? ¿Fuma usted?", en: "Do you have high blood pressure or diabetes? Do you smoke?" },
        alt: ["¿Tiene presión alta, diabetes, o fuma usted?"],
        vocab: ["presión alta", "diabetes", "fumar"]
      },
      {
        patient: { es: "Tengo presión alta, y fumo media cajetilla al día.", en: "I have high blood pressure, and I smoke half a pack a day." },
        cue: "Explain that you'll do an ECG and draw blood for tests.",
        target: { es: "Vamos a hacerle un electrocardiograma y sacarle sangre para unos análisis.", en: "We're going to do an ECG and draw blood for some tests." },
        alt: ["Le vamos a hacer un electrocardiograma y sacar sangre para análisis."],
        vocab: ["electrocardiograma", "sangre", "análisis"]
      },
      {
        patient: { es: "¿Es algo grave, doctor? Tengo miedo.", en: "Is it something serious, doctor? I'm scared." },
        cue: "Acknowledge his fear and reassure him that he is in good hands.",
        target: { es: "Entiendo su miedo. Está en buenas manos y vamos a cuidarle en todo momento.", en: "I understand your fear. You're in good hands and we'll take care of you the whole time." },
        alt: ["Entiendo que tenga miedo. Está en buenas manos y vamos a cuidarle."],
        vocab: ["miedo", "cuidar"]
      },
      {
        patient: { es: "Gracias, doctor.", en: "Thank you, doctor." },
        cue: "Tell him the doctor is coming right away, and to report if the pain changes or worsens.",
        target: { es: "El médico viene en seguida. Avise si el dolor cambia o empeora.", en: "The doctor is coming right away. Let us know if the pain changes or gets worse." },
        alt: ["El médico ya viene. Avísenos si el dolor cambia o empeora."],
        vocab: ["empeorar", "avisar"]
      }
    ]
  },
  {
    id: "sala2",
    room: "02",
    title: "Fiebre pediátrica",
    en: "Pediatric fever",
    setting: "Consulta de pediatría",
    difficulty: 1,
    patient: { name: "Sra. López", age: 31, persona: "Madre preocupada. Trae a Mateo, de 2 años, con fiebre desde anoche.", voice: { pitch: 1.25, rate: 1.0 } },
    steps: [
      {
        patient: { es: "Doctora, mi hijo tiene fiebre desde anoche y no quiere comer.", en: "Doctor, my son has had a fever since last night and doesn't want to eat." },
        cue: "Ask if she took his temperature and how high it has been.",
        target: { es: "¿Le tomó la temperatura? ¿Qué tan alta ha estado?", en: "Did you take his temperature? How high has it been?" },
        alt: ["¿Le midió la temperatura? ¿Qué tan alta estaba?"],
        vocab: ["temperatura", "fiebre"]
      },
      {
        patient: { es: "Anoche tenía treinta y nueve grados.", en: "Last night he had thirty-nine degrees." },
        cue: "Ask about cough, vomiting, or diarrhea.",
        target: { es: "¿Tiene tos, vómito o diarrea?", en: "Does he have a cough, vomiting, or diarrhea?" },
        alt: ["¿Ha tenido tos, vómito o diarrea?"],
        vocab: ["tos", "vómito", "diarrea"]
      },
      {
        patient: { es: "Tiene un poco de tos, pero no ha vomitado.", en: "He has a little cough, but he hasn't vomited." },
        cue: "Ask if he is drinking fluids and wetting diapers as usual.",
        target: { es: "¿Está tomando líquidos? ¿Ha mojado los pañales como siempre?", en: "Is he drinking fluids? Has he wet his diapers as usual?" },
        alt: ["¿Toma líquidos? ¿Moja los pañales como siempre?"],
        vocab: ["líquidos", "pañales"]
      },
      {
        patient: { es: "Toma un poquito de agua, pero menos que antes.", en: "He drinks a little water, but less than before." },
        cue: "Ask if she has given him any medicine for the fever.",
        target: { es: "¿Le ha dado algún medicamento para la fiebre?", en: "Have you given him any medication for the fever?" },
        alt: ["¿Le dio algún medicamento para la fiebre?"],
        vocab: ["medicamento"]
      },
      {
        patient: { es: "Le di paracetamol anoche, nada más.", en: "I gave him acetaminophen last night, that's all." },
        cue: "Say that's good, and that you'll examine him now, with her permission.",
        target: { es: "Muy bien. Voy a examinarlo ahora, con su permiso.", en: "Very good. I'm going to examine him now, with your permission." },
        alt: ["Está bien. Con su permiso, voy a examinarlo ahora."],
        vocab: ["examinar", "permiso"]
      },
      {
        patient: { es: "Claro que sí, doctora.", en: "Of course, doctor." },
        cue: "Explain that Mateo has an ear infection and you'll give him an antibiotic.",
        target: { es: "Mateo tiene una infección del oído. Vamos a darle un antibiótico.", en: "Mateo has an ear infection. We're going to give him an antibiotic." },
        alt: ["Tiene una infección de oído y le vamos a dar un antibiótico."],
        vocab: ["infección", "oído", "antibiótico"]
      },
      {
        patient: { es: "¿Cada cuánto se lo doy?", en: "How often do I give it to him?" },
        cue: "Twice a day, for seven days, with food.",
        target: { es: "Dele el medicamento dos veces al día, por siete días, con comida.", en: "Give him the medication twice a day, for seven days, with food." },
        alt: ["Dos veces al día durante siete días, con comida."],
        vocab: ["dos veces al día", "comida"]
      },
      {
        patient: { es: "¿Y si la fiebre no baja?", en: "And if the fever doesn't go down?" },
        cue: "Return precautions: if fever persists two more days or he won't drink, call or come back.",
        target: { es: "Si la fiebre sigue en dos días, o si no toma líquidos, llame o regrese.", en: "If the fever continues in two days, or if he won't drink fluids, call or come back." },
        alt: ["Si la fiebre no baja en dos días o no toma líquidos, llámenos o regrese."],
        vocab: ["regresar", "llamar"]
      }
    ]
  },
  {
    id: "sala3",
    room: "03",
    title: "Control prenatal",
    en: "First prenatal visit",
    setting: "Consulta de obstetricia",
    difficulty: 2,
    patient: { name: "Sra. García", age: 24, persona: "Primer embarazo. Ilusionada pero nerviosa; prueba casera positiva.", voice: { pitch: 1.2, rate: 1.0 } },
    steps: [
      {
        patient: { es: "Buenos días. Creo que estoy embarazada… la prueba salió positiva.", en: "Good morning. I think I'm pregnant… the test came out positive." },
        cue: "Congratulate her and ask when her last period was.",
        target: { es: "¡Felicidades! ¿Cuándo fue su última regla?", en: "Congratulations! When was your last period?" },
        alt: ["¡Felicidades! ¿Cuándo fue su última menstruación?"],
        vocab: ["embarazada", "regla"]
      },
      {
        patient: { es: "Hace como ocho semanas, más o menos.", en: "About eight weeks ago, more or less." },
        cue: "Ask about nausea, vomiting, or unusual tiredness.",
        target: { es: "¿Ha tenido náuseas, vómito o mucho cansancio?", en: "Have you had nausea, vomiting, or a lot of tiredness?" },
        alt: ["¿Tiene náuseas, vómito o cansancio?"],
        vocab: ["náuseas", "cansancio"]
      },
      {
        patient: { es: "Sí, tengo náuseas por las mañanas.", en: "Yes, I have nausea in the mornings." },
        cue: "Screen for warning signs: any bleeding or belly pain.",
        target: { es: "¿Ha tenido sangrado o dolor en el vientre?", en: "Have you had any bleeding or belly pain?" },
        alt: ["¿Ha tenido sangrado o dolor abdominal?"],
        vocab: ["sangrado", "vientre"]
      },
      {
        patient: { es: "No, nada de eso, gracias a Dios.", en: "No, none of that, thank God." },
        cue: "Ask if this is her first pregnancy.",
        target: { es: "¿Es su primer embarazo?", en: "Is this your first pregnancy?" },
        alt: ["¿Este es su primer embarazo?"],
        vocab: ["embarazo"]
      },
      {
        patient: { es: "Sí, el primero. Estoy un poco nerviosa.", en: "Yes, the first. I'm a little nervous." },
        cue: "Normalize her nerves and start prenatal vitamins with folic acid.",
        target: { es: "Es normal estar nerviosa. Vamos a empezar vitaminas prenatales con ácido fólico.", en: "It's normal to be nervous. We'll start prenatal vitamins with folic acid." },
        alt: ["Es normal. Le voy a recetar vitaminas prenatales con ácido fólico."],
        vocab: ["vitaminas", "ácido fólico"]
      },
      {
        patient: { es: "¿Puedo seguir trabajando?", en: "Can I keep working?" },
        cue: "Yes she can work; avoid alcohol and tobacco, and drink plenty of water.",
        target: { es: "Sí, puede trabajar. Evite el alcohol y el cigarro, y tome mucha agua.", en: "Yes, you can work. Avoid alcohol and cigarettes, and drink plenty of water." },
        alt: ["Sí puede seguir trabajando. Evite el alcohol y el tabaco y tome mucha agua."],
        vocab: ["evitar", "alcohol", "cigarro"]
      },
      {
        patient: { es: "¿Cuándo puedo ver al bebé?", en: "When can I see the baby?" },
        cue: "Tell her you'll do an ultrasound today to see how the baby is doing.",
        target: { es: "Hoy vamos a hacer un ultrasonido para ver cómo va el bebé.", en: "Today we'll do an ultrasound to see how the baby is doing." },
        alt: ["Hoy le vamos a hacer un ultrasonido para ver al bebé."],
        vocab: ["ultrasonido", "bebé"]
      },
      {
        patient: { es: "¡Qué emoción! Gracias, doctora.", en: "How exciting! Thank you, doctor." },
        cue: "Close warmly and schedule the next visit in four weeks.",
        target: { es: "Con mucho gusto. Nos vemos en cuatro semanas para su próxima cita.", en: "My pleasure. See you in four weeks for your next appointment." },
        alt: ["De nada. Nos vemos en cuatro semanas en su próxima cita."],
        vocab: ["cita", "semanas"]
      }
    ]
  },
  {
    id: "sala4",
    room: "04",
    title: "Diabetes",
    en: "Diabetes counseling",
    setting: "Consulta de medicina interna",
    difficulty: 3,
    patient: { name: "Sr. Torres", age: 61, persona: "Diabético tipo 2. Se le olvida la metformina; la A1c ha subido.", voice: { pitch: 0.85, rate: 0.95 } },
    steps: [
      {
        patient: { es: "Doctor, aquí vengo para mi control de la diabetes.", en: "Doctor, I'm here for my diabetes check-up." },
        cue: "Greet him and ask how it's been going with his medications.",
        target: { es: "Buenas tardes, señor Torres. ¿Cómo le ha ido con sus medicamentos?", en: "Good afternoon, Mr. Torres. How has it been going with your medications?" },
        alt: ["Buenas tardes. ¿Cómo le va con sus medicamentos?"],
        vocab: ["control", "medicamentos"]
      },
      {
        patient: { es: "Pues… a veces se me olvida la metformina, para serle sincero.", en: "Well… sometimes I forget the metformin, to be honest with you." },
        cue: "Thank him for his honesty and ask how many times a week he forgets.",
        target: { es: "Gracias por su sinceridad. ¿Cuántas veces a la semana se le olvida?", en: "Thank you for your honesty. How many times a week do you forget?" },
        alt: ["Le agradezco su sinceridad. ¿Cuántas veces por semana se le olvida?"],
        vocab: ["sinceridad", "olvidar"]
      },
      {
        patient: { es: "Como dos o tres veces. Son muchas pastillas, doctor.", en: "About two or three times. It's a lot of pills, doctor." },
        cue: "Ask if he checks his blood sugar at home.",
        target: { es: "¿Se revisa el azúcar en casa?", en: "Do you check your sugar at home?" },
        alt: ["¿Se mide el azúcar en su casa?"],
        vocab: ["azúcar", "revisar"]
      },
      {
        patient: { es: "Casi no. El aparato me confunde.", en: "Hardly ever. The device confuses me." },
        cue: "Explain simply that his labs show the sugar has gone up over the last months.",
        target: { es: "Sus análisis muestran que el azúcar ha subido en los últimos meses.", en: "Your labs show that your sugar has gone up in the last few months." },
        alt: ["Los análisis muestran que su azúcar ha subido estos meses."],
        vocab: ["análisis", "subir"]
      },
      {
        patient: { es: "¿Eso es peligroso, doctor?", en: "Is that dangerous, doctor?" },
        cue: "Explain, without scaring him, that high sugar can damage kidneys, eyes, and feet over time.",
        target: { es: "Con el tiempo, el azúcar alta puede dañar los riñones, los ojos y los pies.", en: "Over time, high sugar can damage the kidneys, the eyes, and the feet." },
        alt: ["Con el tiempo el azúcar elevada puede dañar los riñones, los ojos y los pies."],
        vocab: ["riñones", "ojos", "pies", "dañar"]
      },
      {
        patient: { es: "No quiero terminar como mi hermano, que perdió un pie.", en: "I don't want to end up like my brother, who lost a foot." },
        cue: "Empathize, then offer a plan: a pillbox, and the nurse will teach him to use the meter.",
        target: { es: "Entiendo. Le vamos a dar un pastillero, y la enfermera le enseñará a usar el aparato.", en: "I understand. We'll give you a pillbox, and the nurse will teach you how to use the device." },
        alt: ["Entiendo su preocupación. Le daremos un pastillero y la enfermera le enseñará a usar el aparato."],
        vocab: ["pastillero", "enfermera", "enseñar"]
      },
      {
        patient: { es: "Está bien. ¿Y la comida?", en: "All right. And the food?" },
        cue: "Diet advice: less soda and sweet bread, more vegetables, and walk thirty minutes a day.",
        target: { es: "Menos refresco y pan dulce, más verduras, y camine treinta minutos al día.", en: "Less soda and sweet bread, more vegetables, and walk thirty minutes a day." },
        alt: ["Tome menos refresco, coma menos pan dulce, más verduras, y camine treinta minutos al día."],
        vocab: ["refresco", "verduras", "caminar"]
      },
      {
        patient: { es: "Voy a echarle ganas, doctor.", en: "I'm going to give it my best, doctor." },
        cue: "Encourage him and set follow-up in three months to recheck the sugar.",
        target: { es: "Muy bien, usted puede. Nos vemos en tres meses para revisar el azúcar.", en: "Very good, you can do it. See you in three months to recheck the sugar." },
        alt: ["Ánimo, usted puede. Nos vemos en tres meses para revisar el azúcar."],
        vocab: ["meses", "revisar"]
      }
    ]
  },
  {
    id: "sala5",
    room: "05",
    title: "Consentimiento preanestésico",
    en: "Pre-anesthesia consent",
    setting: "Visita preoperatoria",
    difficulty: 3,
    patient: { name: "Sra. Delgado", age: 45, persona: "Colecistectomía mañana. Muy nerviosa por la anestesia general.", voice: { pitch: 1.15, rate: 0.98 } },
    steps: [
      {
        patient: { es: "Me operan mañana de la vesícula y estoy muy nerviosa por la anestesia.", en: "I'm having gallbladder surgery tomorrow and I'm very nervous about the anesthesia." },
        cue: "Introduce yourself as part of the anesthesia team and normalize her nerves.",
        target: { es: "Soy del equipo de anestesia. Es normal estar nerviosa; le voy a explicar todo.", en: "I'm from the anesthesia team. It's normal to be nervous; I'm going to explain everything." },
        alt: ["Soy parte del equipo de anestesia. Es normal estar nerviosa y le voy a explicar todo."],
        vocab: ["anestesia", "equipo", "explicar"]
      },
      {
        patient: { es: "¿Voy a estar dormida durante toda la operación?", en: "Will I be asleep during the whole operation?" },
        cue: "Explain: with general anesthesia she'll be asleep the whole time, monitored constantly.",
        target: { es: "Sí. Con anestesia general estará dormida toda la operación, y vamos a vigilarla en todo momento.", en: "Yes. With general anesthesia you'll be asleep for the whole operation, and we'll monitor you at all times." },
        alt: ["Sí, estará dormida toda la operación y la vamos a vigilar en todo momento."],
        vocab: ["anestesia general", "vigilar"]
      },
      {
        patient: { es: "Ay, qué alivio.", en: "Oh, what a relief." },
        cue: "Ask if she or anyone in her family has had problems with anesthesia.",
        target: { es: "¿Usted o alguien de su familia ha tenido problemas con la anestesia?", en: "Have you or anyone in your family had problems with anesthesia?" },
        alt: ["¿Usted o su familia han tenido problemas con la anestesia?"],
        vocab: ["familia", "problemas"]
      },
      {
        patient: { es: "Mi mamá dice que vomitó mucho después de una cirugía.", en: "My mom says she vomited a lot after a surgery." },
        cue: "Thank her for telling you; you have medications to prevent nausea.",
        target: { es: "Gracias por decírmelo. Tenemos medicamentos para prevenir las náuseas.", en: "Thank you for telling me. We have medications to prevent nausea." },
        alt: ["Gracias por avisarme. Tenemos medicamentos para prevenir las náuseas."],
        vocab: ["prevenir", "náuseas"]
      },
      {
        patient: { es: "¿Puedo desayunar antes de venir?", en: "Can I have breakfast before coming?" },
        cue: "NPO instructions: nothing to eat or drink after midnight.",
        target: { es: "No. No coma ni beba nada después de la medianoche.", en: "No. Don't eat or drink anything after midnight." },
        alt: ["No, no debe comer ni beber nada después de la medianoche."],
        vocab: ["ayuno", "medianoche"]
      },
      {
        patient: { es: "¿Ni siquiera agua?", en: "Not even water?" },
        cue: "Only a small sip of water for her pills, if instructed.",
        target: { es: "Solo un traguito de agua para sus pastillas, si se lo indicamos.", en: "Only a small sip of water for your pills, if we instruct you to." },
        alt: ["Solamente un trago pequeño de agua para sus pastillas, si se lo indicamos."],
        vocab: ["trago", "pastillas"]
      },
      {
        patient: { es: "¿Y cuáles son los riesgos?", en: "And what are the risks?" },
        cue: "Common ones are minor (sore throat, nausea); serious risks are very rare.",
        target: { es: "Los más comunes son dolor de garganta y náuseas. Los riesgos graves son muy raros.", en: "The most common are a sore throat and nausea. Serious risks are very rare." },
        alt: ["Lo más común es dolor de garganta y náuseas; los riesgos graves son muy raros."],
        vocab: ["riesgos", "garganta", "raros"]
      },
      {
        patient: { es: "Está bien, doctor. Me siento más tranquila.", en: "All right, doctor. I feel calmer." },
        cue: "Invite final questions and ask her to sign the consent if she agrees.",
        target: { es: "¿Tiene alguna otra pregunta? Si está de acuerdo, firme aquí el consentimiento.", en: "Do you have any other questions? If you agree, sign the consent here." },
        alt: ["¿Alguna otra pregunta? Si está de acuerdo, firme el consentimiento aquí."],
        vocab: ["consentimiento", "firmar"]
      }
    ]
  },
  {
    id: "sala6",
    room: "06",
    title: "Entrevista psiquiátrica",
    en: "Psychiatric intake & safety screen",
    setting: "Consulta de psiquiatría",
    difficulty: 3,
    patient: { name: "Srta. Vega", age: 19, persona: "Estudiante universitaria. Habla bajito, mirada al suelo. Dos meses sin ánimo.", voice: { pitch: 1.3, rate: 0.9 } },
    steps: [
      {
        patient: { es: "Mi mamá me hizo venir. Últimamente no tengo ganas de nada.", en: "My mom made me come. Lately I don't feel like doing anything." },
        cue: "Thank her for coming and ask since when she has felt this way.",
        target: { es: "Gracias por venir. ¿Desde cuándo se siente así?", en: "Thank you for coming. Since when have you felt this way?" },
        alt: ["Gracias por venir. ¿Desde cuándo se siente de esta manera?"],
        vocab: ["sentirse", "ganas"]
      },
      {
        patient: { es: "Desde hace como dos meses, cuando empecé la universidad.", en: "For about two months, since I started college." },
        cue: "Ask how she is sleeping.",
        target: { es: "¿Cómo está durmiendo?", en: "How are you sleeping?" },
        alt: ["¿Qué tal está durmiendo?"],
        vocab: ["dormir"]
      },
      {
        patient: { es: "Mal. Me despierto a las cuatro y ya no me duermo.", en: "Badly. I wake up at four and can't fall back asleep." },
        cue: "Ask about appetite and weight loss.",
        target: { es: "¿Y el apetito? ¿Ha bajado de peso?", en: "And your appetite? Have you lost weight?" },
        alt: ["¿Cómo está su apetito? ¿Ha perdido peso?"],
        vocab: ["apetito", "peso"]
      },
      {
        patient: { es: "Casi no como. He bajado como cinco kilos.", en: "I barely eat. I've lost about five kilos." },
        cue: "Ask about anhedonia: has she lost interest in things she used to enjoy.",
        target: { es: "¿Ha perdido el interés en las cosas que antes disfrutaba?", en: "Have you lost interest in the things you used to enjoy?" },
        alt: ["¿Ha perdido el interés por las cosas que antes le gustaban?"],
        vocab: ["interés", "disfrutar"]
      },
      {
        patient: { es: "Sí… ya ni la música me gusta, y antes tocaba guitarra.", en: "Yes… I don't even like music anymore, and I used to play guitar." },
        cue: "Safety screen — ask directly about thoughts of self-harm or suicide.",
        target: { es: "¿Ha tenido pensamientos de hacerse daño o de quitarse la vida?", en: "Have you had thoughts of hurting yourself or taking your own life?" },
        alt: ["¿Ha pensado en hacerse daño o en quitarse la vida?"],
        vocab: ["pensamientos", "hacerse daño"]
      },
      {
        patient: { es: "A veces pienso que sería mejor no despertar… pero no haría nada.", en: "Sometimes I think it would be better not to wake up… but I wouldn't do anything." },
        cue: "Thank her for trusting you, then ask if she has thought of a plan to hurt herself.",
        target: { es: "Gracias por confiar en mí. ¿Ha pensado en algún plan para hacerse daño?", en: "Thank you for trusting me. Have you thought of any plan to hurt yourself?" },
        alt: ["Le agradezco su confianza. ¿Ha pensado en algún plan para hacerse daño?"],
        vocab: ["confiar", "plan"]
      },
      {
        patient: { es: "No, nada de eso. Nunca lo haría.", en: "No, nothing like that. I would never do it." },
        cue: "Explain that what she feels is called depression, it's treatable, and you can start with therapy.",
        target: { es: "Lo que siente se llama depresión, y tiene tratamiento. Podemos empezar con terapia.", en: "What you're feeling is called depression, and it's treatable. We can start with therapy." },
        alt: ["Esto se llama depresión y tiene tratamiento. Podemos empezar con terapia."],
        vocab: ["depresión", "tratamiento", "terapia"]
      },
      {
        patient: { es: "¿De verdad me puedo sentir mejor?", en: "Can I really feel better?" },
        cue: "Instill hope: most people improve with treatment. If those thoughts worsen, call the 988 line.",
        target: { es: "Sí. Con tratamiento, la mayoría mejora. Si esos pensamientos empeoran, llame a la línea nueve ocho ocho.", en: "Yes. With treatment, most people get better. If those thoughts get worse, call the 988 line." },
        alt: ["Sí, con tratamiento la mayoría de las personas mejora. Si los pensamientos empeoran, llame al nueve ocho ocho."],
        vocab: ["mejorar", "línea de crisis"]
      }
    ]
  }
];

const DECKS = [
  {
    id: "anatomia",
    title: "Anatomía",
    en: "Anatomy",
    icon: "🫀",
    cards: [
      { es: "el corazón", en: "heart" }, { es: "los pulmones", en: "lungs" },
      { es: "el hígado", en: "liver" }, { es: "los riñones", en: "kidneys" },
      { es: "el estómago", en: "stomach" }, { es: "la cabeza", en: "head" },
      { es: "el pecho", en: "chest" }, { es: "la espalda", en: "back" },
      { es: "la garganta", en: "throat" }, { es: "el vientre", en: "belly / abdomen" },
      { es: "la mandíbula", en: "jaw" }, { es: "la vesícula", en: "gallbladder" }
    ]
  },
  {
    id: "sintomas",
    title: "Síntomas",
    en: "Symptoms",
    icon: "🤒",
    cards: [
      { es: "la fiebre", en: "fever" }, { es: "la tos", en: "cough" },
      { es: "el mareo", en: "dizziness" }, { es: "las náuseas", en: "nausea" },
      { es: "el vómito", en: "vomiting" }, { es: "la falta de aire", en: "shortness of breath" },
      { es: "el dolor punzante", en: "stabbing pain" }, { es: "el dolor opresivo", en: "pressure-like pain" },
      { es: "la hinchazón", en: "swelling" }, { es: "el sangrado", en: "bleeding" },
      { es: "los escalofríos", en: "chills" }, { es: "la comezón", en: "itching" }
    ]
  },
  {
    id: "meds",
    title: "Medicamentos e instrucciones",
    en: "Meds & instructions",
    icon: "💊",
    cards: [
      { es: "la pastilla", en: "pill" }, { es: "el jarabe", en: "syrup" },
      { es: "la inyección", en: "injection / shot" }, { es: "el suero", en: "IV fluids" },
      { es: "en ayunas", en: "fasting / on an empty stomach" }, { es: "dos veces al día", en: "twice a day" },
      { es: "cada ocho horas", en: "every eight hours" }, { es: "con comida", en: "with food" },
      { es: "la receta", en: "prescription" }, { es: "la dosis", en: "dose" },
      { es: "los efectos secundarios", en: "side effects" }, { es: "la alergia", en: "allergy" }
    ]
  },
  {
    id: "hospital",
    title: "Hospital y estudios",
    en: "Hospital & workup",
    icon: "🏥",
    cards: [
      { es: "la sala de urgencias", en: "emergency room" }, { es: "el quirófano", en: "operating room" },
      { es: "la consulta", en: "clinic visit / office" }, { es: "la enfermera", en: "nurse" },
      { es: "el análisis de sangre", en: "blood test" }, { es: "la radiografía", en: "X-ray" },
      { es: "el ultrasonido", en: "ultrasound" }, { es: "la cita", en: "appointment" },
      { es: "el consentimiento", en: "consent form" }, { es: "el seguro médico", en: "health insurance" },
      { es: "el yeso", en: "cast" }, { es: "la muestra de orina", en: "urine sample" }
    ]
  },
  {
    id: "numeros",
    title: "Números, fechas y dosis",
    en: "Numbers, dates & doses",
    icon: "🔢",
    cards: [
      { es: "quince", en: "fifteen" }, { es: "treinta y nueve", en: "thirty-nine" },
      { es: "ochenta", en: "eighty" }, { es: "ciento veinte", en: "one hundred twenty" },
      { es: "la mitad de la pastilla", en: "half of the pill" }, { es: "quinientos miligramos", en: "500 milligrams" },
      { es: "hace dos semanas", en: "two weeks ago" }, { es: "el año pasado", en: "last year" },
      { es: "en ayunas, por la mañana", en: "fasting, in the morning" }, { es: "cada doce horas", en: "every twelve hours" },
      { es: "tres veces por semana", en: "three times per week" }, { es: "durante diez días", en: "for ten days" }
    ]
  }
];

// per-step emotional arc for each patient (drives the animated portraits)
const SCENARIO_MOODS = {
  sala1: ["pain", "pain", "pain", "worried", "worried", "neutral", "scared", "relieved"],
  sala2: ["worried", "worried", "worried", "neutral", "neutral", "worried", "neutral", "relieved"],
  sala3: ["happy", "neutral", "worried", "relieved", "worried", "neutral", "happy", "happy"],
  sala4: ["neutral", "worried", "neutral", "worried", "scared", "sad", "neutral", "happy"],
  sala5: ["scared", "worried", "relieved", "worried", "neutral", "worried", "worried", "relieved"],
  sala6: ["sad", "sad", "sad", "sad", "sad", "sad", "neutral", "relieved"]
};

const PRONUN_TIPS = [
  "La «rr» se vibra con la punta de la lengua: pe-rro, no pe-ro. Practica con «el carro corre rápido».",
  "La «j» suena como la «h» inglesa fuerte: ojo, bajo, mejor.",
  "La «h» es MUDA: «hígado» empieza con sonido de «í».",
  "Las vocales son puras y cortas: «no» es /no/, nunca /nou/.",
  "La «ñ» es como «ny» en canyon: riñón, niño, mañana.",
  "La «d» entre vocales se suaviza casi como «th» en «the»: to-do, na-da.",
  "La «ll» y la «y» suenan igual: pastilla, ayuda.",
  "«Qué tan fuerte» — el acento escrito marca la pregunta, la voz sube al final.",
  "En «usted», la «d» final casi desaparece: /usté/.",
  "La «z» y la «c» (ce, ci) suenan como «s» en Latinoamérica: corazón = /corasón/."
];
