<?php

namespace Database\Seeders;

/**
 * The Earthquakes course (Grade 11 General Science, Weeks 6-7), written from the
 * DulaTuon "Module Content" and "Sequence of the Content" documents. Six missions,
 * each with flipbook lessons, a self-check quiz and its 3D lab on the last lesson.
 */
class EarthquakeCourseBlueprint
{
    private const IMAGE_PATH = '/image/earthquakes/';

    /**
     * @return array<string, mixed>
     */
    public static function blueprint(): array
    {
        return [
            'code' => 'DLT-101',
            'title' => 'Earthquakes',
            'short' => 'Grade 11 General Science: how earthquakes begin, how their energy travels, why they happen in the Philippines, what they do to the land, and how to stay safe.',
            'description' => 'DulaTuon Interactive Learning Module, Grade 11 General Science, Third Term, Weeks 6–7: Understanding Earthquakes. Complete six missions (Fault Lab, Shake Town, Wave Tank, Quake Tracker, Ground Test and Quake Ready) to describe earthquakes as geological hazards, including their causes, characteristics and effects, and to explain appropriate disaster preparedness and safety measures. Each mission pairs flipbook lessons with a self-check quiz and a 3D lab.',
            'level' => 'Beginner',
            'modules' => self::modules(),
            'games' => [
                ['Build an Earthquake', 'fault_lab', 2],
                ['Energy Release Activity', 'shake_town', 3],
                ['Seismic Wave Lab', 'wave_tank', 5],
                ['Philippine Quake Explorer', 'quake_tracker', 8],
                ['Earthquake Evidence Investigation', 'ground_test', 10],
                ['Earthquake Response Simulator', 'quake_ready', 11],
            ],
            'quizzes' => self::quizzes(),
            'assignment' => ['Family Earthquake Plan', 'Make a one-page earthquake plan for your home: the safe places where you can Drop, Cover, and Hold On in each room, your evacuation route, your emergency supplies, and where your family meets after the shaking. Remember: Preparedness begins before the ground starts shaking.'],
            'activity' => ['Safe Spots Map', 'Walk through your classroom and mark the safest places to Drop, Cover, and Hold On, and the routes to your designated evacuation area.'],
        ];
    }

    /**
     * Mission => lessons; each lesson is [title, pages].
     *
     * @return array<string, array<int, array{0: string, 1: array<int, array<string, mixed>>}>>
     */
    private static function modules(): array
    {
        return [
            'Mission 1 — Fault Lab' => [
                ['What Is an Earthquake?', [
                    self::page('Welcome to DulaTuon: Mission 1', '<p><strong>Fault Lab: How Earthquakes Begin.</strong> Plate tectonics, faults, focus and epicenter.</p><p>Your DulaTuon Journey has 6 missions. Complete all six missions to reach 100% progress. Grade 11 General Science · Third Term · Weeks 6–7 · Understanding Earthquakes.</p>', 'Mission question: how does an earthquake begin?'),
                    self::page('Why Does the Ground Shake?', '<p>Have you ever felt the ground suddenly shake or heard reports of an earthquake somewhere in the Philippines? Although the ground beneath us may appear still, Earth is constantly changing. Movements within Earth’s crust can sometimes cause the sudden shaking that we experience as an earthquake.</p>', '', [['01-why-ground-shakes', '']], 'image-right'),
                    self::page('What Is an Earthquake?', '<p>An earthquake is the sudden shaking of the ground caused by the rapid release of energy when rocks suddenly break or move along a fault beneath Earth’s surface. The released energy travels away from the earthquake source as seismic waves, causing the ground to move or shake.</p>', '', [['02-earthquake-damage', '']], 'image-right'),
                    self::page('Two Types of Earthquakes', '<p>There are two types of earthquakes: tectonic and volcanic earthquakes.</p><p><strong>Tectonic earthquakes</strong> are produced by sudden movement along faults and plate boundaries.</p><p><strong>Volcanic earthquakes</strong> are earthquakes induced by rising lava or magma beneath active volcanoes.</p>', '', [['03-tectonic-earthquake', 'Tectonic earthquake'], ['04-volcanic-earthquake', 'Volcanic earthquake']], 'two-images'),
                    self::page('A Connected Geologic Process', '<p>An earthquake is therefore not simply the movement we feel at Earth’s surface. It is the result of a connected geologic process occurring beneath the ground.</p>', 'Tectonic movement → Stress builds in rocks → Sudden movement along a fault → Energy is released → Seismic waves travel outward → Ground shaking occurs', [['05-earthquake-process', '']], 'image-top'),
                    self::page('Earth Is Made of Moving Plates', '<p>Earth’s rigid outer layer is divided into large sections called <strong>tectonic plates</strong>. These plates move very slowly relative to one another. Although their movement is usually too slow for us to notice, it creates forces that can deform rocks, build stress, and contribute to movement along faults.</p><p>Tectonic plates interact in three major ways: convergent, divergent, and transform.</p>', ''),
                    self::page('Convergent Movement', '<p><strong>Convergent movement</strong> occurs when two plates move toward each other. At some convergent boundaries, one plate moves beneath another in a process called <strong>subduction</strong>. This type of movement is especially important in understanding the tectonic setting and earthquake activity of the Philippines.</p>', '', [['06-convergent-boundary', 'Convergent boundary']], 'image-right'),
                    self::page('Divergent Movement', '<p><strong>Divergent movement</strong> occurs when two plates move away from each other. As the plates separate, material from beneath Earth’s surface can rise and new crust can form.</p>', '', [['07-divergent-boundary', 'Divergent boundary']], 'image-right'),
                    self::page('Transform Movement', '<p><strong>Transform movement</strong> occurs when two plates move horizontally past each other. Their movement can generate stress in rocks and contribute to fault movement and earthquakes.</p>', '', [['08-transform-boundary', 'Transform boundary']], 'image-right'),
                ]],
                ['Stress and Faults', [
                    self::page('From Tectonic Movement to Stress', '<p>Tectonic plates are constantly moving, although their movement is usually very slow. As plates move toward, away from, or past one another, they exert forces on rocks in Earth’s crust. These forces produce <strong>stress</strong>, which is the force acting on a rock per unit area. Over time, stress can cause rocks to change shape, break, or move.</p>', '', [['09-types-of-stress', 'Before stress, compression, tension and shearing']], 'image-right'),
                    self::page('Three Types of Stress', '<p>There are three main types of stress that affect rocks:</p><ul><li><strong>Tension</strong> occurs when forces pull rocks away from each other. This causes the crust to stretch and become thinner. Tensional stress is commonly associated with areas where the crust is being pulled apart.</li><li><strong>Compression</strong> occurs when forces push rocks toward each other. This squeezes and shortens the crust. Compressional stress is common in areas where tectonic plates or crustal blocks move toward one another.</li><li><strong>Shear</strong> occurs when forces act in opposite directions, causing rocks to move sideways past one another. Instead of mainly stretching or compressing the crust, shear changes the shape of rocks through lateral movement.</li></ul>', ''),
                    self::page('When Rocks Break: The Fault', '<p>Rocks can withstand a certain amount of stress without breaking. They may bend, compress, stretch, or otherwise deform as stress increases. However, when the stress becomes greater than the strength of the rocks or overcomes resistance along an existing fracture, the rocks may break or suddenly move.</p><p>This brings us to an important structure involved in many earthquakes: the <strong>fault</strong>. A fault is a fracture or zone of fractures in Earth’s crust along which blocks of rock have moved relative to one another. A fault is therefore different from an ordinary crack because movement has occurred along it.</p>', ''),
                    self::page('Types of Faults', '<p>The blocks of rock on either side of a fault may move upward, downward, or sideways depending on the type of stress acting on them. This produces different types of faults.</p><p>Next, meet the three fault types: the normal fault, the reverse and thrust fault, and the strike-slip fault.</p>', ''),
                    self::page('Normal Fault', '<p>A normal fault commonly forms when rocks are subjected to tensional stress. As the crust is stretched or pulled apart, one block of rock moves downward relative to the block on the other side of the fault.</p>', 'Tension → rocks are pulled apart → normal fault', [['10-normal-fault', 'Normal fault']], 'image-right'),
                    self::page('Reverse and Thrust Fault', '<p>A reverse fault commonly forms when rocks experience compressional stress. As the crust is pushed together, one block of rock is forced upward relative to the other.</p><p>A thrust fault is a type of reverse fault in which movement occurs along a relatively low-angle fault surface. Both reverse and thrust faults result from crustal compression.</p>', 'Compression → rocks are pushed together → reverse/thrust fault', [['11-reverse-fault', 'Reverse fault']], 'image-right'),
                    self::page('Strike-Slip Fault', '<p>A strike-slip fault forms mainly under shear stress. Instead of moving mainly upward or downward, the blocks of rock move mostly horizontally past each other.</p><p>An important Philippine example is the Philippine Fault, a major strike-slip fault system extending through large portions of the country.</p>', 'Shear → rocks move sideways → strike-slip fault', [['12-strike-slip-fault', 'Strike-slip fault']], 'image-right'),
                ]],
                ['Where Earthquakes Begin', [
                    self::page('From Stress to Sudden Fault Movement', '<p>Tectonic plates and crustal blocks move continuously, but faults do not necessarily move all the time. Along some parts of a fault, friction can resist movement and keep the rocks temporarily locked even while tectonic forces continue to act.</p><p>As stress builds, the surrounding rocks may slowly change shape or elastically deform, storing elastic energy. This deformation may continue for years or even longer without producing noticeable ground shaking.</p>', '', [['13-elastic-rebound', 'Crust at rest, crust deformed, ruptured crust, fractured crust']], 'image-top'),
                    self::page('Elastic Rebound', '<p>Eventually, the accumulated stress may become sufficient to overcome the resistance along the fault. The rocks then suddenly slip, releasing some of the stored elastic energy. This sudden release of energy generates seismic waves that travel outward from the earthquake source.</p><p>This process is related to the <strong>elastic rebound theory</strong>: rocks deform as stress accumulates and, when fault movement occurs, rebound toward a less-deformed state.</p>', 'Tectonic movement → Stress accumulates → Rocks deform and store elastic energy → Friction keeps the fault locked → Sudden fault slip → Energy is released → Earthquake occurs'),
                    self::page('Where Does an Earthquake Begin?', '<p>When an earthquake occurs, the shaking may be felt across a wide area, but the earthquake itself begins at a specific location beneath Earth’s surface.</p><p>The point within Earth where the rupture begins is called the <strong>focus</strong>, also known as the <strong>hypocenter</strong>. From this source, earthquake energy is released and travels outward as seismic waves.</p><p>Directly above the focus is a point on Earth’s surface called the <strong>epicenter</strong>. The epicenter is commonly reported in earthquake bulletins and shown on maps because it provides a convenient surface location associated with the earthquake. However, the epicenter is not where the earthquake begins.</p>', '', [['14-focus-epicenter', 'Epicenter, hypocenter (focus), fault plane and surface waves']], 'image-right'),
                    self::page('How Deep Is an Earthquake?', '<p>Earthquakes do not all begin at the same depth beneath Earth’s surface. The <strong>focal depth</strong>, also called hypocentral depth, is the distance from Earth’s surface to the focus or hypocenter of an earthquake.</p><p>Earthquake depth is important because it is one of several factors that can influence how shaking is experienced at the surface. In general, earthquakes that occur closer to the surface can produce strong shaking near their source, although the actual intensity experienced at a location also depends on the earthquake’s magnitude, distance from the source, and local ground conditions.</p>', ''),
                    self::page('The Three Depth Categories', '<p>Seismologists divide earthquakes into three depth ranges, and the boundaries reflect genuine differences in physics rather than arbitrary convention.</p>', '', [['15-depth-categories', 'Shallow, intermediate and deep-focus earthquakes']], 'image-top'),
                    self::page('Shallow, Intermediate and Deep-Focus', '<ul><li><strong>Shallow: less than 70 km.</strong> About 75% of all earthquakes, and the overwhelming majority of damaging ones. These occur within the crust and the uppermost mantle. Because the rupture is close to the surface, the energy arrives concentrated over a relatively small area, producing intense shaking directly above the focus.</li><li><strong>Intermediate: 70–300 km.</strong> These occur within subducting slabs of oceanic lithosphere descending into the mantle. Shaking near the epicenter is generally weaker than a shallow event of the same magnitude, but it is felt across a wider area because the waves radiate from deeper down.</li><li><strong>Deep-focus: 300–700 km.</strong> Rare and confined almost entirely to subduction zones. They can be very large (magnitude 8 deep-focus events have been recorded) yet cause remarkably little surface damage. The 2013 magnitude 8.3 Sea of Okhotsk earthquake, 609 km deep, was felt across an enormous area of Asia but caused essentially no damage.</li></ul>', ''),
                    self::page('Why Depth Changes Everything', '<p>Seismic energy spreads out as it travels, and its intensity falls roughly with the square of the distance travelled, plus additional losses to attenuation in the rock. That geometry is unforgiving.</p><p>Consider a magnitude 6.0. At 10 km depth, someone standing directly above the focus is 10 km from the source. At 300 km depth, that same person is 300 km from the source, thirty times further away. The energy reaching them is a tiny fraction of what the shallow event delivered.</p>', 'A magnitude 5.5 at 8 km can damage buildings in a town directly above it. A magnitude 6.5 at 250 km may be felt over a thousand kilometres yet break nothing.'),
                    self::page('Depth and Tall Buildings', '<p>There is a second consequence. Because deep events radiate from far below, the shaking they produce is dominated by longer-period waves by the time it reaches the surface. Long-period motion is comparatively harmless to small stiff buildings but can be problematic for tall structures, which resonate at longer periods.</p>', 'Ready? Try Build an Earthquake in the Fault Lab.'),
                ]],
            ],

            'Mission 2 — Shake Town' => [
                ['How Earthquake Energy Travels', [
                    self::page('Welcome to Mission 2', '<p><strong>Shake Town: How Earthquake Energy Travels.</strong> Energy release, seismic waves and ground shaking.</p>', 'Mission question: how does the energy from the focus make the ground shake in a town far away?'),
                    self::page('How Does Earthquake Energy Travel?', '<p>When rocks suddenly break or slip along a fault, stored energy is released from the focus (hypocenter) of the earthquake. This energy travels outward through Earth and along its surface as vibrations called <strong>seismic waves</strong>.</p><p>Seismic waves carry earthquake energy away from the source. As they travel through Earth and reach the surface, they cause the ground to move or shake. This is why an earthquake can be felt many kilometers away from where the rupture began.</p>', '', [['05-earthquake-process', 'Seismic waves travel outward from the focus']], 'image-right'),
                    self::page('Two Major Categories of Waves', '<p>Seismic waves are grouped into two major categories: <strong>body waves</strong>, which travel through Earth’s interior, and <strong>surface waves</strong>, which travel along Earth’s surface.</p>', 'Remember: seismic energy spreads out as it travels. The farther the waves go, the weaker the shaking.'),
                ]],
            ],

            'Mission 3 — Wave Tank' => [
                ['Body and Surface Waves', [
                    self::page('Welcome to Mission 3', '<p><strong>Wave Tank: Seismic Waves and Seismograms.</strong> P waves, S waves, Love waves and Rayleigh waves.</p>', 'Mission question: how do different seismic waves move, and how do scientists record them?'),
                    self::page('Body Waves', '<p><strong>P waves (Primary waves)</strong> are the fastest seismic waves and are usually the first to arrive at a seismic station. They are compressional waves, causing particles of material to move back and forth in the same general direction as the wave travels. Because of the way they move, P waves can travel through solids and liquids.</p><p><strong>S waves (Secondary waves)</strong> travel more slowly than P waves and therefore arrive later. They are shear waves, causing particles to move perpendicular to the direction in which the wave travels. Unlike P waves, S waves can travel only through solids and cannot pass through liquids.</p>', '', [['16-seismic-waves', 'P wave, S wave, Rayleigh wave and Love wave']], 'image-top'),
                    self::page('Surface Waves', '<p>When seismic energy reaches Earth’s surface, it can also travel as surface waves. Surface waves generally travel more slowly than P and S waves, but they can produce strong and prolonged ground motion near the surface. The two major types are Love waves and Rayleigh waves.</p>', ''),
                    self::page('Love Waves and Rayleigh Waves', '<p><strong>Love waves</strong> move the ground from side to side in a horizontal motion perpendicular to the direction the wave travels. They do not produce significant vertical ground movement. Their strong horizontal motion can be particularly damaging to structures.</p><p><strong>Rayleigh waves</strong> produce a rolling or elliptical motion, causing the ground to move both vertically and horizontally. Their movement is often compared to the rolling motion of ocean waves, although Rayleigh waves travel through the solid surface of Earth rather than through water.</p>', ''),
                    self::page('Watch: How Earthquakes Show Us the Inside of the Earth', '<p>Watch the video to see how seismic waves reveal what is inside Earth.</p><p><a href="https://www.youtube.com/watch?v=7c-m0-FICio" target="_blank" rel="noopener noreferrer">How earthquakes show us the inside of the Earth (YouTube)</a></p>', ''),
                ]],
                ['Detecting and Recording Earthquakes', [
                    self::page('How Do Scientists Detect and Record Earthquakes?', '<p>Earthquakes may occur deep beneath Earth’s surface, so scientists rely on instruments to detect and study the seismic waves they produce.</p><p>A <strong>seismometer</strong> is an instrument that detects and measures ground motion caused by seismic waves. The record of this ground motion is called a <strong>seismogram</strong>. A seismogram shows the arrival and movement of different seismic waves through time.</p>', ''),
                    self::page('P and S Arrival Times', '<p>Because P waves travel faster than S waves, P waves usually arrive at a seismic station first. S waves arrive later. The difference between their arrival times provides scientists with useful information about the distance between the seismic station and the earthquake source.</p><p>By comparing seismic-wave records from multiple monitoring stations, scientists can determine important information about an earthquake, including its location, depth, and magnitude.</p>', 'Bigger gap between the P wave and the S wave means the earthquake is farther away.'),
                    self::page('PHIVOLCS Monitoring', '<p>In the Philippines, PHIVOLCS operates seismic monitoring stations that continuously detect and record earthquake activity throughout the country.</p><p>Watch: <a href="https://www.youtube.com/watch?v=EEtI9ZNZeK0" target="_blank" rel="noopener noreferrer">How We Measure Earthquakes? The Science Behind Seismographs! (YouTube)</a></p>', 'Ready? Try the Seismic Wave Lab.'),
                ]],
            ],

            'Mission 4 — Quake Tracker' => [
                ['Why Earthquakes Occur in the Philippines', [
                    self::page('Welcome to Mission 4', '<p><strong>Quake Tracker: Earthquakes in the Philippines.</strong> Tectonic setting, active faults, trenches and historical earthquakes.</p>', 'Mission question: which fault or trench caused each earthquake?'),
                    self::page('Why Earthquakes Occur in the Philippines', '<p>The Philippines is one of the most tectonically active countries in the world. Beneath and around the archipelago, tectonic plates and smaller crustal blocks continue to move relative to one another. This movement has produced a complex network of active faults, fault systems, and deep ocean trenches that extends from Luzon to Mindanao. Because these earthquake-generating structures are found throughout the country, earthquakes can occur in many different parts of the Philippines.</p>', '', [['18-ring-of-fire', 'The Philippines at the heart of the Pacific Ring of Fire']], 'image-right'),
                    self::page('The Philippine Fault Zone', '<p>One of the most important of these structures is the <strong>Philippine Fault Zone (PFZ)</strong>. It is a major left-lateral strike-slip fault system approximately 1,200 kilometers long, extending from northwestern Luzon to southeastern Mindanao. Rather than being a single continuous crack, the Philippine Fault is divided into several segments. PHIVOLCS reports that approximately 90% of its on-land extent has already been mapped through aerial photographs, satellite images, and field investigations.</p>', '', [['17-ph-faults-trenches', 'Distribution of active faults and trenches in the Philippines']], 'image-right'),
                    self::page('Earthquakes in Luzon: 1990', '<p>In Luzon, the activity of the Philippine Fault was dramatically demonstrated by the 16 July 1990 Luzon earthquake. The earthquake had a magnitude of about 7.8 in PHIVOLCS’s historical documentation and was produced by strike-slip movement along the northwestern part of the Philippine Fault Zone and its Digdig Fault splay. The earthquake produced approximately 125 kilometers of surface rupture, extending from Dingalan, Aurora to Kayapa, Nueva Vizcaya. In some locations, horizontal displacement reached several meters.</p>', '', [['19-luzon-1990', 'Damage from the 16 July 1990 Luzon earthquake']], 'image-right'),
                    self::page('Stress, Slip and Rupture', '<p>The 1990 earthquake provides a clear example of the processes discussed earlier in this lesson. Tectonic forces caused stress to accumulate in rocks along the fault. When the rocks could no longer remain locked, sudden movement occurred and stored energy was released as seismic waves. The resulting movement was powerful enough to rupture and permanently displace parts of Earth’s surface.</p><p>However, the Philippine Fault is not the only earthquake-generating structure in Luzon. Other active faults occur in different parts of the island.</p>', 'An earthquake occurring in Luzon should not automatically be attributed to the Philippine Fault. Scientists examine the earthquake’s location, depth, fault geometry, focal mechanism, and other evidence to determine its likely source.'),
                ]],
                ['Earthquakes in the Visayas and Mindanao', [
                    self::page('Earthquakes in the Visayas: Leyte 2017', '<p>The Philippine Fault continues southward into the central Philippines, passing through areas such as Masbate and Leyte. This helps explain why significant earthquakes have also occurred in the Visayas. On 6 July 2017, for example, a magnitude 6.5 earthquake struck Leyte. PHIVOLCS determined that the earthquake was generated by movement of the Leyte Segment of the Philippine Fault. Its focus was only about 2 kilometers deep, and strong shaking was experienced in Leyte and surrounding islands. PHIVOLCS recorded 297 aftershocks by the afternoon of the following day.</p>', '', [['20-leyte-2017', 'Leyte, 6 July 2017']], 'image-right'),
                    self::page('Bohol 2013', '<p>Eastern Visayas is influenced not only by the Philippine Fault but also by the Philippine Trench and other local faults. This shows why understanding Philippine earthquakes requires looking at several tectonic structures rather than only one major fault. Other parts of the Visayas have their own earthquake-generating faults. The 2013 magnitude 7.2 Bohol earthquake, for example, produced surface rupture associated with reverse faulting along the North Bohol Fault. In some areas, the ground was displaced upward by approximately two meters.</p>', '', [['21-bohol-2013', 'Bohol, 2013']], 'image-right'),
                    self::page('Cebu 2025', '<p>More recently, on 30 September 2025, a Mw 6.9 earthquake struck northern Cebu. Detailed PHIVOLCS investigation determined that the earthquake was generated by the Bogo Bay Fault, a newly identified northeast-trending right-lateral strike-slip fault. This finding is especially interesting because it demonstrates that scientists continue to improve their understanding and mapping of active earthquake sources in the Philippines.</p><p>The Cebu earthquake also produced a long sequence of aftershocks. This reminds us that after a major fault rupture, surrounding rocks may continue to adjust to the changed stress conditions, producing smaller earthquakes after the main event.</p>', '', [['22-cebu-2025', 'Northern Cebu, 30 September 2025']], 'image-right'),
                    self::page('Earthquakes in Mindanao', '<p>Mindanao has an equally complex tectonic setting. Numerous active faults occur across the island, while major trenches are located offshore. This means that earthquakes affecting Mindanao may originate from fault movement within the island, offshore faults, or tectonic processes associated with nearby subduction zones.</p><p>The Philippine Fault extends into eastern Mindanao, where it is divided into several segments. Other fault systems occur in central, northern, and western portions of the island. In Northern Mindanao and neighboring areas, PHIVOLCS maps identify structures such as the Central Mindanao Fault, Cabanglasan Fault, Tagoloan River Fault, Lanao Fault System, and other mapped active faults.</p>', ''),
                    self::page('Offshore Structures', '<p>Offshore structures are equally important. To the east is the Philippine Trench, while the Cotabato Trench influences the tectonic setting of southern Mindanao. At these subduction-related structures, movement of tectonic plates can generate powerful earthquakes beneath or near the sea.</p>', ''),
                    self::page('Sarangani 2026', '<p>A striking recent example occurred on 8 June 2026, when a Mw 7.8 earthquake occurred offshore of Sarangani. PHIVOLCS located the earthquake approximately 32 kilometers west of Maasim, Sarangani, at a depth of about 33 kilometers. Based on its location, focal mechanism, and aftershock distribution, PHIVOLCS reported that the earthquake may be attributed to subduction along the Cotabato Trench.</p>', '', [['23-sarangani-2026-map', 'Mw 7.8 offshore Sarangani, 8 June 2026']], 'image-right'),
                    self::page('Sarangani Aftershocks', '<p>The earthquake was followed by numerous aftershocks. PHIVOLCS had already recorded 138 aftershocks within several hours of the main earthquake, ranging from magnitude 1.3 to 6.7. Earthquake activity related to the sequence continued afterward; for example, PHIVOLCS identified a Mw 6.0 earthquake on 6 July 2026 near Davao Occidental as an aftershock of the June earthquake sequence.</p>', '', [['24-sarangani-2026-damage', 'After the 8 June 2026 earthquake'], ['25-sarangani-2026-rescue', 'Rescue work after the earthquake']], 'two-images'),
                ]],
                ['Earthquake Sequences', [
                    self::page('Earthquakes Continue to Occur', '<p>The earthquakes of 1990, 2013, 2017, and 2025 are not simply events from Philippine history. PHIVOLCS records from January to August 2026 continue to show earthquakes occurring in different parts of Luzon, Visayas, and Mindanao. Some were small and detected mainly by instruments, while others were strong enough to be felt over wide areas.</p><p>These recent earthquakes demonstrate an important scientific idea: the tectonic processes affecting the Philippines are still active today. Plates and crustal blocks continue to move, stress continues to accumulate and be released, and earthquakes continue to occur along different tectonic structures.</p>', ''),
                    self::page('Which Fault Caused It?', '<p>It is also important not to assume that every earthquake recorded near a place was produced by the nearest known fault. Scientists use data from seismic monitoring stations to determine an earthquake’s epicenter, depth, magnitude, and other characteristics, and combine these observations with geological evidence to identify its likely tectonic source.</p><p>Explore: <a href="https://maps.phivolcs.dost.gov.ph/" target="_blank" rel="noopener noreferrer">PHIVOLCS Maps Portal</a> · <a href="https://faultfinder.phivolcs.dost.gov.ph/" target="_blank" rel="noopener noreferrer">PHIVOLCS FaultFinder</a> · <a href="https://earthquaketoday.org/philippines" target="_blank" rel="noopener noreferrer">Philippines Earthquakes Today: Live Tracker &amp; Map</a></p>', ''),
                    self::page('Why Do More Earthquakes Sometimes Follow?', '<p>A strong earthquake is sometimes followed by many smaller earthquakes in the same general area. These earthquakes are part of what scientists call an <strong>earthquake sequence</strong>.</p><p>The <strong>mainshock</strong> is the largest earthquake in the sequence.</p><p><strong>Aftershocks</strong> are smaller earthquakes that occur in the same general area after the mainshock. They occur as rocks in and around the ruptured fault zone continue to adjust to changes in stress caused by the main earthquake. Aftershocks may continue for days, weeks, months, or even longer depending on the earthquake sequence.</p>', ''),
                    self::page('Foreshocks', '<p>Sometimes, smaller earthquakes occur before the largest earthquake in a sequence. These are called <strong>foreshocks</strong>. However, an earthquake can only be identified as a foreshock after a larger earthquake occurs.</p>', 'A small earthquake does not automatically mean that a stronger earthquake will follow.'),
                ]],
            ],

            'Mission 5 — Ground Test' => [
                ['Magnitude and Intensity', [
                    self::page('Welcome to Mission 5', '<p><strong>Ground Test: Earthquake Strength and Effects.</strong> Magnitude, intensity, ground rupture, landslides and liquefaction.</p>', 'Mission question: how strong was the earthquake, and what did it do to the land?'),
                    self::page('How Strong Was the Earthquake?', '<p>When an earthquake occurs, people often hear two terms in news reports: <strong>magnitude</strong> and <strong>intensity</strong>. They are related to an earthquake, but they do not mean the same thing.</p>', '', [['26-magnitude-intensity', 'Magnitude is energy; intensity is damage']], 'image-top'),
                    self::page('Magnitude', '<p><strong>Magnitude</strong> represents the size of an earthquake in terms of the energy released at its source. It is determined from instrumental recordings of the earthquake.</p><p>An earthquake has a measured magnitude associated with the event.</p>', ''),
                    self::page('Intensity', '<p><strong>Intensity</strong> describes how strongly an earthquake is felt and its observed effects at a particular location. Therefore, the same earthquake may produce different intensities in different places.</p><p>In the Philippines, PHIVOLCS uses the PHIVOLCS Earthquake Intensity Scale (PEIS) to describe observed shaking and effects.</p><p><a href="https://www.phivolcs.dost.gov.ph/phivolcs-earthquake-intensity-scale-peis/" target="_blank" rel="noopener noreferrer">PHIVOLCS Earthquake Intensity Scale (PEIS)</a></p>', ''),
                    self::page('Concept Comparison', '<p><strong>Magnitude</strong></p><ul><li>Size/energy of the earthquake</li><li>Determined using instrumental data</li><li>Associated with the earthquake event</li><li>Expressed numerically</li></ul><p><strong>Intensity</strong></p><ul><li>Severity of shaking/effects at a location</li><li>Based on observed/felt effects</li><li>Can differ from place to place</li><li>PEIS uses Roman numerals</li></ul>', ''),
                ]],
                ['How Earthquakes Affect the Philippines', [
                    self::page('From Underground Movement to Changes at the Surface', '<p>When an earthquake occurs, the most immediate effect people notice is ground shaking. However, earthquakes can do much more than make the ground move. Strong shaking and sudden movement along faults can alter Earth’s surface, destabilize slopes, and change the behavior of loose, water-saturated sediments. In this way, earthquakes are part of the geologic processes that continuously shape and reshape the Philippine landscape.</p><p>The type and severity of earthquake effects are not the same everywhere. They can vary depending on factors such as the magnitude and depth of the earthquake, distance from the source, local ground conditions, and characteristics of the surrounding landscape.</p>', ''),
                    self::page('Ground Shaking', '<p>Ground shaking is the vibration or movement of the ground caused by seismic waves traveling through Earth and along its surface. It is the most widely experienced effect of an earthquake.</p><p>Shaking is not necessarily equally strong in all places. Communities affected by the same earthquake may report different intensities because they are located at different distances from the earthquake source and have different local ground conditions. Soft sediments, for example, can sometimes amplify shaking compared with more solid rock.</p>', 'One earthquake has one magnitude, but the intensity of shaking can vary from place to place.', [['27-ground-shaking', 'Ground shaking']], 'image-right'),
                    self::page('Ground Rupture', '<p>Sometimes, movement along a fault extends all the way to Earth’s surface. When this happens, the ground may be broken and permanently displaced. This is called <strong>ground rupture</strong> or surface faulting.</p><p>The two sides of the fault may move horizontally, vertically, or in a combination of directions depending on the type of fault movement. Ground rupture can therefore leave visible evidence of the tectonic forces that produced an earthquake.</p>', 'Not every earthquake produces visible ground rupture. The rupture must reach the surface for this effect to occur.', [['28-ground-rupture', 'Ground rupture']], 'image-right'),
                    self::page('Earthquake-Induced Landslides', '<p>Strong earthquake shaking can also disturb slopes. On steep mountainsides, hills, road cuts, and other unstable slopes, shaking may cause soil, rocks, and debris to move downslope, producing an earthquake-induced landslide.</p><p>This is particularly relevant in the Philippines because many areas have mountainous and steep terrain. The likelihood of slope failure depends not only on earthquake shaking but also on slope steepness, rock and soil conditions, and other local factors.</p>', 'An earthquake can affect the landscape even when the fault itself does not rupture directly beneath the slope.', [['29-landslide', 'Landslide']], 'image-right'),
                    self::page('Liquefaction', '<p>Another important earthquake effect is <strong>liquefaction</strong>. It can occur when loose, water-saturated sediments experience strong shaking.</p><p>Normally, the grains of soil are in contact and support the material above them. During intense shaking, water pressure between the grains can increase and the sediment can temporarily lose much of its strength. The ground may then behave more like a fluid than a stable solid.</p>', '', [['30-liquefaction', 'Stable soil and liquified soil']], 'image-right'),
                    self::page('Effects of Liquefaction', '<p>Liquefaction can result in ground settlement, tilting, lateral movement, cracks, and the emergence of water and sand at the surface.</p>', 'Liquefaction does not occur during every earthquake. Suitable sediment, sufficient groundwater, and strong enough shaking must be present.'),
                ]],
            ],

            'Mission 6 — Quake Ready' => [
                ['Before, During and After an Earthquake', [
                    self::page('Welcome to Mission 6', '<p><strong>Quake Ready: Earthquake Disaster Preparedness.</strong> Before, during and after an earthquake.</p>', 'Mission question: what should you do before, during and after an earthquake?'),
                    self::page('From Understanding the Hazard to Taking Action', '<p>Understanding how earthquakes occur and how they affect the ground is important, but scientific knowledge becomes even more useful when it helps us make safer decisions.</p><p>Earthquakes can occur without sufficient warning for people to evacuate before shaking begins. For this reason, earthquake preparedness focuses on knowing what to do before, during, and after an earthquake. Being prepared can reduce injuries, confusion, and other risks when strong ground shaking occurs.</p>', ''),
                    self::page('Before an Earthquake: Be Prepared', '<p>Preparation should begin before an earthquake happens. Know the earthquake hazards that may affect your home, school, and community. These may include strong ground shaking, ground rupture, landslides, liquefaction, and, in some coastal areas, tsunami hazards.</p><p>Identify safe places inside buildings, such as locations where you can protect yourself from falling objects. Know the evacuation routes and designated evacuation areas in your school or community.</p>', ''),
                    self::page('Secure, Supply, Practice', '<p>Heavy furniture, shelves, appliances, and other objects that may fall or move during strong shaking should be properly secured. Emergency supplies such as water, food, a flashlight, first-aid materials, necessary medicines, and communication supplies should also be readily accessible.</p><p>Most importantly, participate seriously in earthquake drills. Practicing appropriate actions beforehand can help you respond more quickly during an actual earthquake.</p>', 'Preparedness begins before the ground starts shaking.'),
                    self::page('During an Earthquake: Protect Yourself', '<p>When strong shaking begins, remain calm and immediately protect yourself.</p><p>If you are indoors, follow <strong>DROP, COVER, AND HOLD ON</strong>:</p><ul><li><strong>DROP</strong> to your hands and knees to reduce the chance of being knocked down.</li><li><strong>COVER</strong> your head and neck and, when possible, take shelter under a sturdy table or desk.</li><li><strong>HOLD ON</strong> to your shelter and remain protected until the strong shaking stops.</li></ul><p>Stay away from windows, glass, shelves, cabinets, and objects that may fall.</p>', 'DROP, COVER, AND HOLD ON'),
                    self::page('Outdoors, Near the Coast', '<p>If you are outdoors, move to an open area away from buildings, walls, trees, electrical posts, and other objects that may fall.</p><p>If you are near the coast and the earthquake is strong or prolonged, be alert to possible tsunami danger and follow official evacuation guidance.</p>', 'Do not panic and run while strong shaking is occurring. Protect yourself first.'),
                    self::page('After an Earthquake: Stay Alert', '<p>When the shaking stops, carefully assess your surroundings. Check yourself and others for injuries and move away from damaged buildings or other unsafe areas when it is safe to do so.</p><p>Be prepared for aftershocks. As discussed earlier, aftershocks are smaller earthquakes that may occur following the mainshock. Although usually smaller than the mainshock, they can cause additional damage, especially to structures that have already been weakened.</p>', ''),
                    self::page('Hazards and Official Information', '<p>Watch for hazards such as broken glass, fallen objects, damaged electrical lines, fires, unstable slopes, and damaged structures.</p><p>Follow information and instructions from PHIVOLCS, local government units, school authorities, and other official disaster-management agencies. Avoid spreading unverified information through social media.</p><p>Do not immediately enter a visibly damaged building until appropriate authorities determine that it is safe.</p>', 'Ready? Try the Earthquake Response Simulator.'),
                ]],
            ],
        ];
    }

    /**
     * Self-check quizzes, one per mission. Each is [title, lesson index, questions].
     *
     * @return array<int, array{title: string, session: int, questions: array<int, array{0: string, 1: array<int, array{0: string, 1: bool}>}>}>
     */
    private static function quizzes(): array
    {
        return [
            [
                'title' => 'Mission 1 Self-Check: How Earthquakes Begin',
                'session' => 2,
                'questions' => [
                    self::question('What is an earthquake?', 'The sudden shaking of the ground caused by the rapid release of energy when rocks break or move along a fault', ['The slow bending of rocks over many years', 'The movement of ocean water toward the shore', 'The cooling of lava after an eruption']),
                    self::question('Which earthquakes are produced by sudden movement along faults and plate boundaries?', 'Tectonic earthquakes', ['Volcanic earthquakes', 'Surface earthquakes', 'Elastic earthquakes']),
                    self::question('At some convergent boundaries, one plate moves beneath another. What is this process called?', 'Subduction', ['Divergence', 'Elastic rebound', 'Transformation']),
                    self::question('Forces that pull rocks away from each other and stretch the crust are called…', 'Tension', ['Compression', 'Shear', 'Friction']),
                    self::question('Which type of fault commonly forms under tensional stress?', 'Normal fault', ['Reverse fault', 'Strike-slip fault', 'Thrust fault']),
                    self::question('Which type of fault forms mainly under shear stress, with blocks moving mostly horizontally past each other?', 'Strike-slip fault', ['Normal fault', 'Reverse fault', 'Thrust fault']),
                    self::question('What keeps a fault temporarily locked while tectonic forces continue to act?', 'Friction', ['Seismic waves', 'The epicenter', 'Magma']),
                    self::question('According to the elastic rebound theory, what happens when fault movement occurs?', 'Rocks rebound toward a less-deformed state and stored elastic energy is released', ['Rocks keep storing more elastic energy', 'Rocks become permanently locked', 'The epicenter moves below the focus']),
                    self::question('The point within Earth where an earthquake rupture begins is called the…', 'Focus (hypocenter)', ['Epicenter', 'Fault plane', 'Seismic station']),
                    self::question('What is the epicenter?', 'The point on Earth’s surface directly above the focus', ['The point where the rupture begins', 'The deepest point of the fault', 'The place where aftershocks stop']),
                    self::question('An earthquake is classified as shallow when its focal depth is…', 'Less than 70 km', ['70 to 300 km', '300 to 700 km', 'More than 700 km']),
                ],
            ],
            [
                'title' => 'Mission 2 Self-Check: How Earthquake Energy Travels',
                'session' => 3,
                'questions' => [
                    self::question('What happens to the stored energy when rocks suddenly slip along a fault?', 'It is released from the focus and travels outward as seismic waves', ['It stays stored in the rocks', 'It turns into magma', 'It travels only along the surface']),
                    self::question('What are the vibrations that carry earthquake energy away from the source called?', 'Seismic waves', ['Tectonic waves', 'Elastic waves', 'Ocean waves']),
                    self::question('Why can an earthquake be felt many kilometers away from where the rupture began?', 'Seismic waves carry the energy away from the source and shake the ground where they arrive', ['The fault stretches all the way to every place that feels it', 'The epicenter moves to each town', 'Magma rises under every town']),
                    self::question('Seismic waves that travel through Earth’s interior are called…', 'Body waves', ['Surface waves', 'Love waves', 'Rayleigh waves']),
                    self::question('Seismic waves that travel along Earth’s surface are called…', 'Surface waves', ['Body waves', 'P waves', 'S waves']),
                    self::question('A magnitude 6.0 earthquake starts 300 km deep instead of 10 km. Why does a person directly above it feel much less shaking?', 'The person is thirty times farther from the source, so far less energy reaches them', ['A deep earthquake releases no energy', 'Deep rocks cannot make seismic waves', 'The shaking is felt only at the epicenter']),
                ],
            ],
            [
                'title' => 'Mission 3 Self-Check: Seismic Waves and Seismograms',
                'session' => 5,
                'questions' => [
                    self::question('Which seismic waves are the fastest and usually arrive first at a seismic station?', 'P waves', ['S waves', 'Love waves', 'Rayleigh waves']),
                    self::question('How do particles of material move in a P wave?', 'Back and forth in the same general direction as the wave travels', ['Perpendicular to the direction the wave travels', 'In a rolling, elliptical motion', 'Side to side along the surface only']),
                    self::question('Which statement about S waves is correct?', 'They are shear waves that can travel only through solids', ['They are the fastest seismic waves', 'They can travel through solids and liquids', 'They travel only along Earth’s surface']),
                    self::question('A layer of liquid is in the way of the seismic waves. Which wave can pass through it?', 'Only the P wave', ['Only the S wave', 'Both the P and S waves', 'Neither wave']),
                    self::question('Which surface wave moves the ground from side to side with no significant vertical movement?', 'Love wave', ['Rayleigh wave', 'P wave', 'S wave']),
                    self::question('Which surface wave produces a rolling or elliptical motion, like ocean waves?', 'Rayleigh wave', ['Love wave', 'P wave', 'S wave']),
                    self::question('What is a seismometer?', 'An instrument that detects and measures ground motion caused by seismic waves', ['A map of active faults', 'A scale that rates observed damage', 'A device that stops earthquakes']),
                    self::question('What is a seismogram?', 'The record of ground motion that shows the arrival of seismic waves through time', ['The instrument that measures ground motion', 'The point above the focus', 'A list of aftershocks']),
                    self::question('What does the difference between the P-wave and S-wave arrival times tell scientists?', 'The distance between the seismic station and the earthquake source', ['The color of the rocks underground', 'The name of the fault', 'The time of the next earthquake']),
                ],
            ],
            [
                'title' => 'Mission 4 Self-Check: Earthquakes in the Philippines',
                'session' => 8,
                'questions' => [
                    self::question('Why can earthquakes occur in many different parts of the Philippines?', 'Active faults, fault systems and deep trenches extend from Luzon to Mindanao', ['There is only one fault in the whole country', 'Earthquakes occur only near volcanoes', 'The Philippines is far from any plate boundary']),
                    self::question('What kind of fault system is the Philippine Fault Zone?', 'A major left-lateral strike-slip fault system about 1,200 km long', ['A normal fault only in Luzon', 'A deep ocean trench in the east', 'A single short thrust fault']),
                    self::question('The 16 July 1990 Luzon earthquake produced about 125 km of surface rupture. Which structure produced it?', 'The northwestern part of the Philippine Fault Zone and its Digdig Fault splay', ['The Cotabato Trench', 'The Bogo Bay Fault', 'The North Bohol Fault']),
                    self::question('Which statement about earthquakes in Luzon is correct?', 'An earthquake in Luzon should not automatically be attributed to the Philippine Fault', ['Every Luzon earthquake comes from the Philippine Fault', 'No other active faults occur in Luzon', 'The nearest fault always caused the earthquake']),
                    self::question('The 6 July 2017 magnitude 6.5 Leyte earthquake was generated by which structure?', 'The Leyte Segment of the Philippine Fault', ['The North Bohol Fault', 'The Cotabato Trench', 'The Philippine Trench']),
                    self::question('The 2013 magnitude 7.2 Bohol earthquake produced surface rupture along which fault?', 'The North Bohol Fault (reverse faulting)', ['The Bogo Bay Fault', 'The Central Mindanao Fault', 'The Leyte Segment']),
                    self::question('The 30 September 2025 Mw 6.9 northern Cebu earthquake was generated by which fault?', 'The Bogo Bay Fault', ['The Philippine Fault Zone', 'The North Bohol Fault', 'The Cotabato Trench']),
                    self::question('The 8 June 2026 Mw 7.8 earthquake offshore of Sarangani may be attributed to subduction along which structure?', 'The Cotabato Trench', ['The Philippine Trench', 'The Lanao Fault System', 'The Digdig Fault']),
                    self::question('What is the mainshock in an earthquake sequence?', 'The largest earthquake in the sequence', ['The first earthquake that is felt', 'The last earthquake in the sequence', 'The smallest earthquake in the sequence']),
                    self::question('Smaller earthquakes that follow the mainshock in the same general area are called…', 'Aftershocks', ['Foreshocks', 'Mainshocks', 'Tremors of the focus']),
                    self::question('Does a small earthquake automatically mean that a stronger earthquake will follow?', 'No. A foreshock can be identified only after a larger earthquake occurs', ['Yes. Every small earthquake is a foreshock', 'Yes, within one day', 'No. Small earthquakes never come before large ones']),
                ],
            ],
            [
                'title' => 'Mission 5 Self-Check: Earthquake Strength and Effects',
                'session' => 10,
                'questions' => [
                    self::question('What does magnitude represent?', 'The size of an earthquake in terms of the energy released at its source', ['How strongly the earthquake is felt at one place', 'The depth of the focus', 'The damage to buildings']),
                    self::question('What does intensity describe?', 'How strongly an earthquake is felt and its observed effects at a particular location', ['The energy released at the source', 'The length of the fault', 'The number of aftershocks']),
                    self::question('One earthquake can have…', 'One magnitude but different intensities in different places', ['Different magnitudes in different places', 'One intensity everywhere', 'No magnitude until it is felt']),
                    self::question('Which scale does PHIVOLCS use to describe observed shaking and effects in the Philippines?', 'The PHIVOLCS Earthquake Intensity Scale (PEIS)', ['The Elastic Rebound Scale', 'The Philippine Trench Scale', 'The Focal Depth Scale']),
                    self::question('How is intensity expressed in the PEIS?', 'In Roman numerals', ['In decimal numbers like 6.5', 'In kilometers', 'In letters A to F']),
                    self::question('Why can two communities report different intensities for the same earthquake?', 'They are at different distances from the source and have different local ground conditions', ['The earthquake has a different magnitude for each community', 'The focus moves during the shaking', 'Intensity does not depend on location']),
                    self::question('What can happen to shaking on soft sediments compared with more solid rock?', 'It can be amplified', ['It always disappears', 'It is always weaker', 'It does not change']),
                    self::question('What is ground rupture?', 'Fault movement that reaches Earth’s surface and breaks and permanently displaces the ground', ['Soil that behaves like a fluid', 'Soil and rocks sliding down a slope', 'Shaking felt by many people']),
                    self::question('Does every earthquake produce visible ground rupture?', 'No. The rupture must reach the surface', ['Yes, every earthquake does', 'Yes, but only on land', 'No. Only volcanic earthquakes do']),
                    self::question('Which conditions make an earthquake-induced landslide more likely?', 'Steep slopes, unstable rock and soil, and strong shaking', ['Flat ground and weak shaking', 'Dry, solid rock on level land', 'A fault that never moves']),
                    self::question('What is needed for liquefaction to occur?', 'Loose, water-saturated sediment and strong enough shaking', ['Solid rock and dry ground', 'A steep slope and dry soil', 'Only a very deep earthquake']),
                ],
            ],
            [
                'title' => 'Mission 6 Self-Check: Earthquake Disaster Preparedness',
                'session' => 11,
                'questions' => [
                    self::question('When should earthquake preparation begin?', 'Before an earthquake happens', ['When the shaking starts', 'After the aftershocks', 'Only when a warning is announced']),
                    self::question('Which of these should be done before an earthquake?', 'Secure heavy furniture and know your evacuation routes', ['Stand near windows to watch', 'Wait for a warning before preparing', 'Leave emergency supplies out of reach']),
                    self::question('Which emergency supplies should be readily accessible?', 'Water, food, a flashlight, first-aid materials, necessary medicines and communication supplies', ['Only a phone', 'Only extra furniture', 'Nothing, since earthquakes give plenty of warning']),
                    self::question('What does DROP, COVER, AND HOLD ON tell you to do when strong shaking begins indoors?', 'Drop to hands and knees, cover your head and neck under a sturdy table, and hold on until the shaking stops', ['Run outside as fast as you can', 'Stand in a doorway and watch', 'Stay next to the windows']),
                    self::question('What should you do if you are outdoors during strong shaking?', 'Move to an open area away from buildings, walls, trees and electrical posts', ['Stand next to the nearest building', 'Climb a tree', 'Run under an electrical post']),
                    self::question('You are near the coast and the earthquake is strong or prolonged. What should you do?', 'Be alert to possible tsunami danger and follow official evacuation guidance', ['Go to the beach to look', 'Stay and wait for the tide to rise', 'Ignore it if the shaking has stopped']),
                    self::question('Why should you be prepared for aftershocks?', 'They can cause additional damage, especially to structures already weakened', ['They are always bigger than the mainshock', 'They never happen after a strong earthquake', 'They happen only underwater']),
                    self::question('Which of these is a hazard to watch for after an earthquake?', 'Broken glass, fallen objects, damaged electrical lines, fires and unstable slopes', ['Only the sound of the earthquake', 'Clean, undamaged walls', 'Nothing, because the danger is over']),
                    self::question('A post online says a bigger earthquake will hit at 3 PM. What should you do?', 'Avoid spreading it and follow PHIVOLCS and other official agencies', ['Share it with everyone right away', 'Believe it because many people shared it', 'Run outside immediately']),
                    self::question('When can you enter a visibly damaged building again?', 'Only after appropriate authorities determine that it is safe', ['Right after the shaking stops', 'As soon as you want to get your things', 'After checking it yourself']),
                ],
            ],
        ];
    }

    /**
     * @param  array<int, array{0: string, 1?: string}>  $images  [file name without extension, caption]
     * @return array{0: string, 1: string, 2: string, 3: array<int, array{url: string, caption: string}>, 4: string}
     */
    private static function page(string $heading, string $body, string $highlight = '', array $images = [], string $layout = 'text'): array
    {
        return [
            $heading,
            $body,
            $highlight,
            array_map(fn (array $image): array => [
                'url' => self::IMAGE_PATH.$image[0].'.jpg',
                'caption' => $image[1] ?? '',
            ], $images),
            $layout,
        ];
    }

    /**
     * A multiple-choice question whose correct option sits at a position that depends on the text.
     *
     * @param  array<int, string>  $wrong
     * @return array{0: string, 1: array<int, array{0: string, 1: bool}>}
     */
    private static function question(string $text, string $correct, array $wrong): array
    {
        $options = array_map(fn (string $option): array => [$option, false], $wrong);
        array_splice($options, crc32($text) % (count($options) + 1), 0, [[$correct, true]]);

        return [$text, $options];
    }
}
