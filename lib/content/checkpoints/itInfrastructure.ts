/**
 * IT Infrastructure checkpoint packs.
 *
 * Covers: CompTIA A+, CompTIA Network+, CompTIA Security+, IBM IT Support,
 * AWS Cloud Technology, and Google IT Automation with Python.
 *
 * Follows the content rules in ./types.ts: workplace scenarios, no trivia,
 * plausible-beginner-mistake distractors, teaching explanations.
 */

import { ProgramCheckpointPack } from './types';

export const IT_INFRASTRUCTURE_PACKS: ProgramCheckpointPack[] = [
  // ==========================================================================
  // CompTIA A+ Professional Certificate
  // ==========================================================================
  {
    programSlug: 'comptia-a-professional-certificate',
    programTitle: 'CompTIA A+ Professional Certificate',
    whyItMatters:
      'These checkpoints show employers you can fix real computer problems, not just pass a test.',
    courses: [
      {
        courseSlug: 'comptia-a-course-1',
        courseName: 'IT Fundamentals and Hardware Essentials',
        programSlug: 'comptia-a-professional-certificate',
        checkpoints: [
          {
            id: 'comptia-a-course-1-cp-1',
            courseSlug: 'comptia-a-course-1',
            programSlug: 'comptia-a-professional-certificate',
            demonstratedSkill: 'Diagnose why a computer will not turn on',
            onetSkills: ['Equipment Maintenance'],
            scenario:
              'A coworker says her desktop computer is "completely dead." You press the power button and nothing happens — no lights, no fan noise, no beeps.',
            question: 'What should you check first?',
            options: [
              { id: 'a', text: 'Replace the hard drive' },
              {
                id: 'b',
                text: 'Check that the power cable is plugged in and the power supply switch is on',
              },
              { id: 'c', text: 'Reinstall Windows' },
              { id: 'd', text: 'Replace the monitor' },
            ],
            correctOptionId: 'b',
            explanation:
              'No lights or fans means the computer is getting no power at all, so check the power source first. The hard drive, Windows, and monitor cannot cause a totally dead machine.',
            level: 'foundation',
          },
          {
            id: 'comptia-a-course-1-cp-2',
            courseSlug: 'comptia-a-course-1',
            programSlug: 'comptia-a-professional-certificate',
            demonstratedSkill: 'Install computer memory safely',
            onetSkills: ['Installation'],
            scenario:
              'Your manager asks you to add more RAM to an office computer. You have the new memory stick in hand and the computer is shut down.',
            question: 'What should you do before touching the parts inside the case?',
            options: [
              {
                id: 'a',
                text: 'Unplug the power cable and ground yourself with an anti-static strap',
              },
              { id: 'b', text: 'Turn the computer back on so you can see if the RAM works' },
              { id: 'c', text: 'Spray the inside of the case with cleaner' },
              { id: 'd', text: 'Remove the hard drive to make room' },
            ],
            correctOptionId: 'a',
            explanation:
              'Static electricity from your body can destroy memory chips, so always unplug the machine and ground yourself first. Working inside a powered-on computer is dangerous for you and the parts.',
            level: 'foundation',
          },
        ],
      },
      {
        courseSlug: 'comptia-a-course-2',
        courseName: 'Networking, Peripherals, and Wireless Technologies',
        programSlug: 'comptia-a-professional-certificate',
        checkpoints: [
          {
            id: 'comptia-a-course-2-cp-1',
            courseSlug: 'comptia-a-course-2',
            programSlug: 'comptia-a-professional-certificate',
            demonstratedSkill: 'Troubleshoot a slow Wi-Fi connection',
            onetSkills: ['Troubleshooting'],
            scenario:
              'An employee in a back office complains her Wi-Fi is very slow, but coworkers near the front say theirs is fine. Her laptop shows only one signal bar.',
            question: 'What is the most likely cause?',
            options: [
              { id: 'a', text: 'Her laptop has a virus' },
              { id: 'b', text: 'The internet provider is having an outage' },
              { id: 'c', text: 'She is too far from the wireless access point' },
              { id: 'd', text: 'Her email inbox is full' },
            ],
            correctOptionId: 'c',
            explanation:
              'One signal bar plus coworkers nearby being fine points to weak signal from distance or walls. A provider outage would affect everyone, and viruses or full inboxes do not lower signal bars.',
            level: 'foundation',
          },
          {
            id: 'comptia-a-course-2-cp-2',
            courseSlug: 'comptia-a-course-2',
            programSlug: 'comptia-a-professional-certificate',
            demonstratedSkill: 'Fix a printer that everyone in the office shares',
            onetSkills: ['Troubleshooting', 'Operations Analysis'],
            scenario:
              'The shared office printer stopped printing for everyone at once. Jobs are stuck in the queue. The printer screen says it is online and has paper and toner.',
            question: 'What should you try first?',
            options: [
              { id: 'a', text: 'Buy a new printer' },
              { id: 'b', text: 'Clear the stuck print queue and restart the printer' },
              { id: 'c', text: 'Reinstall Windows on every computer in the office' },
              { id: 'd', text: 'Replace the toner even though it is not empty' },
            ],
            correctOptionId: 'b',
            explanation:
              'A jammed print queue blocks every job behind it, so clearing the queue and restarting is the quickest safe fix. The other options cost time and money without addressing the stuck jobs.',
            level: 'applied',
          },
        ],
      },
      {
        courseSlug: 'comptia-a-course-3',
        courseName: 'Advanced Networking, Virtualization, and IT Security',
        programSlug: 'comptia-a-professional-certificate',
        checkpoints: [
          {
            id: 'comptia-a-course-3-cp-1',
            courseSlug: 'comptia-a-course-3',
            programSlug: 'comptia-a-professional-certificate',
            demonstratedSkill: 'Choose virtualization to save hardware costs',
            onetSkills: ['Systems Analysis'],
            scenario:
              'Your company needs to test software on Windows and Linux. Your manager does not want to buy a second physical computer for the Linux tests.',
            question: 'What do you recommend?',
            options: [
              { id: 'a', text: 'Run Linux in a virtual machine on the existing computer' },
              { id: 'b', text: 'Delete Windows and install Linux instead' },
              { id: 'c', text: 'Buy a second computer anyway' },
              { id: 'd', text: 'Tell the team Linux testing is not possible' },
            ],
            correctOptionId: 'a',
            explanation:
              'A virtual machine lets one computer run a second operating system safely alongside the first. Deleting Windows would break existing work, and the goal was to avoid buying hardware.',
            level: 'applied',
          },
          {
            id: 'comptia-a-course-3-cp-2',
            courseSlug: 'comptia-a-course-3',
            programSlug: 'comptia-a-professional-certificate',
            demonstratedSkill: 'Respond safely to a suspected malware infection',
            onetSkills: ['Systems Evaluation'],
            scenario:
              'A user reports pop-ups and a fake "your PC is infected, call this number" warning. The computer is on the office network with shared drives.',
            question: 'What is the right first step?',
            options: [
              { id: 'a', text: 'Call the phone number in the warning to get help' },
              { id: 'b', text: 'Disconnect the computer from the network, then run a malware scan' },
              { id: 'c', text: 'Ignore it — pop-ups are normal' },
              { id: 'd', text: 'Forward the warning to all staff so they can see it' },
            ],
            correctOptionId: 'b',
            explanation:
              'Disconnecting first stops malware from spreading to shared drives, then you can clean the machine. The phone number is part of the scam, and ignoring it leaves the network at risk.',
            level: 'applied',
          },
        ],
      },
      {
        courseSlug: 'comptia-a-course-4',
        courseName: 'Foundations of Computer Hardware and Storage',
        programSlug: 'comptia-a-professional-certificate',
        checkpoints: [
          {
            id: 'comptia-a-course-4-cp-1',
            courseSlug: 'comptia-a-course-4',
            programSlug: 'comptia-a-professional-certificate',
            demonstratedSkill: 'Catch a failing hard drive before data is lost',
            onetSkills: ['Equipment Maintenance', 'Quality Control Analysis'],
            scenario:
              'A user says his computer makes clicking noises, freezes often, and yesterday a file would not open. His work files are only saved on that computer.',
            question: 'What should you do first?',
            options: [
              { id: 'a', text: 'Back up his files right away, because the drive may be failing' },
              { id: 'b', text: 'Tell him to keep using it until it fully stops working' },
              { id: 'c', text: 'Add more RAM to stop the freezing' },
              { id: 'd', text: 'Mute the speakers so the clicking is not annoying' },
            ],
            correctOptionId: 'a',
            explanation:
              'Clicking plus freezes plus unreadable files are classic signs of a dying hard drive, and backing up first protects the data. RAM and speakers have nothing to do with these symptoms.',
            level: 'applied',
          },
          {
            id: 'comptia-a-course-4-cp-2',
            courseSlug: 'comptia-a-course-4',
            programSlug: 'comptia-a-professional-certificate',
            demonstratedSkill: 'Pick the right storage upgrade for a slow computer',
            onetSkills: ['Quality Control Analysis'],
            scenario:
              'An office computer takes five minutes to start and opens programs slowly. It has an old spinning hard drive. Your manager approves one affordable upgrade.',
            question: 'Which upgrade will help the most?',
            options: [
              { id: 'a', text: 'A bigger monitor' },
              { id: 'b', text: 'Replacing the hard drive with a solid-state drive (SSD)' },
              { id: 'c', text: 'A new keyboard and mouse' },
              { id: 'd', text: 'A faster internet plan' },
            ],
            correctOptionId: 'b',
            explanation:
              'Slow startup and slow program loading are usually caused by an old spinning drive, and an SSD fixes exactly that. Monitors, keyboards, and internet speed do not affect how fast programs load from disk.',
            level: 'applied',
          },
        ],
      },
      {
        courseSlug: 'comptia-a-course-5',
        courseName: 'Operating Systems and Networking Fundamentals',
        programSlug: 'comptia-a-professional-certificate',
        checkpoints: [
          {
            id: 'comptia-a-course-5-cp-1',
            courseSlug: 'comptia-a-course-5',
            programSlug: 'comptia-a-professional-certificate',
            demonstratedSkill: 'Use the command line to check a network problem',
            onetSkills: ['Troubleshooting'],
            scenario:
              'A user cannot reach any websites. You want to quickly test whether her computer can reach the office router at all before blaming the internet provider.',
            question: 'Which command-line tool do you use?',
            options: [
              { id: 'a', text: 'ping the router’s address to see if it responds' },
              { id: 'b', text: 'Delete the browser history' },
              { id: 'c', text: 'Format the hard drive' },
              { id: 'd', text: 'Open Task Manager and close all programs' },
            ],
            correctOptionId: 'a',
            explanation:
              'Ping sends a quick test message and tells you in seconds whether the router is reachable, which narrows down where the problem is. The other actions do not test the network at all.',
            level: 'applied',
          },
          {
            id: 'comptia-a-course-5-cp-2',
            courseSlug: 'comptia-a-course-5',
            programSlug: 'comptia-a-professional-certificate',
            demonstratedSkill: 'Fix a computer stuck on an update',
            onetSkills: ['Troubleshooting', 'Technology Design'],
            scenario:
              'A Windows computer has shown "Working on updates, 27%" for four hours. The user has a deadline today and asks you what to do.',
            question: 'What is the best response?',
            options: [
              { id: 'a', text: 'Immediately unplug the computer to force a restart' },
              {
                id: 'b',
                text: 'Get her working on a spare computer, and let the update finish or recover safely',
              },
              { id: 'c', text: 'Tell her updates are not important and disable them forever' },
              { id: 'd', text: 'Reinstall Windows from scratch right now' },
            ],
            correctOptionId: 'b',
            explanation:
              'Cutting power mid-update can corrupt Windows, so solve the user’s deadline with a spare machine while handling the update safely. Disabling updates creates security risk, and a full reinstall is a last resort.',
            level: 'job_ready',
          },
        ],
      },
      {
        courseSlug: 'comptia-a-course-6',
        courseName: 'Advanced Networking, Security, and IT Operations',
        programSlug: 'comptia-a-professional-certificate',
        checkpoints: [
          {
            id: 'comptia-a-course-6-cp-1',
            courseSlug: 'comptia-a-course-6',
            programSlug: 'comptia-a-professional-certificate',
            demonstratedSkill: 'Handle a user who fell for a phishing email',
            onetSkills: ['Systems Evaluation', 'Operations Monitoring'],
            scenario:
              'An employee admits she clicked a link in a fake "password reset" email and typed her work password into the site. She feels embarrassed and asks you to keep it quiet.',
            question: 'What do you do?',
            options: [
              { id: 'a', text: 'Keep it quiet so she does not get in trouble' },
              {
                id: 'b',
                text: 'Have her change her password now and report the incident per company policy',
              },
              { id: 'c', text: 'Delete the email and consider it handled' },
              { id: 'd', text: 'Tell her to wait and see if anything bad happens' },
            ],
            correctOptionId: 'b',
            explanation:
              'A stolen password can be used within minutes, so reset it immediately and report it so the security team can watch for misuse. Hiding or waiting gives attackers more time.',
            level: 'job_ready',
          },
          {
            id: 'comptia-a-course-6-cp-2',
            courseSlug: 'comptia-a-course-6',
            programSlug: 'comptia-a-professional-certificate',
            demonstratedSkill: 'Roll out changes without breaking the whole office',
            onetSkills: ['Systems Analysis', 'Operations Monitoring'],
            scenario:
              'You need to apply a network firmware update across 30 office computers. The vendor says the update is safe, but you have never run it before.',
            question: 'What is the smartest rollout plan?',
            options: [
              { id: 'a', text: 'Update all 30 computers at once during the workday' },
              {
                id: 'b',
                text: 'Test the update on one or two machines first, then roll out to the rest',
              },
              { id: 'c', text: 'Skip the update — updates cause problems' },
              { id: 'd', text: 'Ask each user to run the update whenever they feel like it' },
            ],
            correctOptionId: 'b',
            explanation:
              'Testing on a small group first means a bad update affects two machines instead of thirty. Skipping updates leaves security holes, and an unmanaged rollout is impossible to support.',
            level: 'job_ready',
          },
        ],
      },
    ],
  },

  // ==========================================================================
  // CompTIA Network+ Professional Certificate
  // ==========================================================================
  {
    programSlug: 'comptia-network-professional-certificate',
    programTitle: 'CompTIA Network+ Professional Certificate',
    whyItMatters:
      'These checkpoints prove you can keep a business network running when something breaks.',
    courses: [
      {
        courseSlug: 'comptia-network-course-1',
        courseName: 'Introduction to Networking',
        programSlug: 'comptia-network-professional-certificate',
        checkpoints: [
          {
            id: 'comptia-network-course-1-cp-1',
            courseSlug: 'comptia-network-course-1',
            programSlug: 'comptia-network-professional-certificate',
            demonstratedSkill: 'Identify which network device a small office needs',
            onetSkills: ['Technology Design'],
            scenario:
              'A small business has internet from one modem, but only one computer can plug into it. They want five computers and office Wi-Fi connected.',
            question: 'What device do you recommend?',
            options: [
              { id: 'a', text: 'A second modem for each computer' },
              { id: 'b', text: 'A wireless router to share the connection with all devices' },
              { id: 'c', text: 'A longer network cable' },
              { id: 'd', text: 'A printer with Wi-Fi' },
            ],
            correctOptionId: 'b',
            explanation:
              'A router shares one internet connection across many wired and wireless devices — that is its job. Extra modems or longer cables do not let multiple devices share the connection.',
            level: 'foundation',
          },
          {
            id: 'comptia-network-course-1-cp-2',
            courseSlug: 'comptia-network-course-1',
            programSlug: 'comptia-network-professional-certificate',
            demonstratedSkill: 'Tell a local network problem apart from an internet problem',
            onetSkills: ['Technology Design'],
            scenario:
              'In a small office, staff can print to the network printer and open shared files, but no one can load any websites.',
            question: 'Where is the problem most likely?',
            options: [
              { id: 'a', text: 'Every computer’s network card failed at once' },
              { id: 'b', text: 'The internet connection or modem, not the local network' },
              { id: 'c', text: 'The shared printer' },
              { id: 'd', text: 'Every keyboard is broken' },
            ],
            correctOptionId: 'b',
            explanation:
              'Printing and file sharing prove the local network works, so the failure is where the office connects to the internet. Many network cards failing at the same moment is extremely unlikely.',
            level: 'foundation',
          },
        ],
      },
      {
        courseSlug: 'comptia-network-course-2',
        courseName: 'Networking Fundamentals',
        programSlug: 'comptia-network-professional-certificate',
        checkpoints: [
          {
            id: 'comptia-network-course-2-cp-1',
            courseSlug: 'comptia-network-course-2',
            programSlug: 'comptia-network-professional-certificate',
            demonstratedSkill: 'Spot an IP address conflict',
            onetSkills: ['Technology Design'],
            scenario:
              'Two computers in the office keep dropping off the network. You check their settings and find both were manually given the same IP address.',
            question: 'How do you fix it?',
            options: [
              { id: 'a', text: 'Give each computer a different, unused IP address' },
              { id: 'b', text: 'Restart both computers and hope it stops' },
              { id: 'c', text: 'Replace the network cables on both machines' },
              { id: 'd', text: 'Turn off the office firewall' },
            ],
            correctOptionId: 'a',
            explanation:
              'Two devices cannot share one IP address — the network gets confused about who is who. Restarting or new cables will not help while the addresses still clash.',
            level: 'foundation',
          },
          {
            id: 'comptia-network-course-2-cp-2',
            courseSlug: 'comptia-network-course-2',
            programSlug: 'comptia-network-professional-certificate',
            demonstratedSkill: 'Plan enough network addresses for a growing office',
            onetSkills: ['Mathematics', 'Technology Design'],
            scenario:
              'Your office network is set up to hand out 50 IP addresses. The company is hiring, and soon there will be 45 staff, each with a laptop and a phone on Wi-Fi.',
            question: 'What problem should you warn your manager about?',
            options: [
              { id: 'a', text: 'Nothing — 45 people fit within 50 addresses' },
              {
                id: 'b',
                text: '90 devices will need addresses, so the 50-address pool will run out',
              },
              { id: 'c', text: 'Phones do not use IP addresses, so only laptops count' },
              { id: 'd', text: 'The Wi-Fi password will stop working at 50 people' },
            ],
            correctOptionId: 'b',
            explanation:
              'Each device needs its own address, so 45 laptops plus 45 phones is 90 — well over the 50 available. Counting devices, not people, is the key habit.',
            level: 'applied',
          },
        ],
      },
      {
        courseSlug: 'comptia-network-course-3',
        courseName: 'Introduction to Contemporary Operating Systems and Hardware',
        programSlug: 'comptia-network-professional-certificate',
        checkpoints: [
          {
            id: 'comptia-network-course-3-cp-1',
            courseSlug: 'comptia-network-course-3',
            programSlug: 'comptia-network-professional-certificate',
            demonstratedSkill: 'Check network settings on Windows and Linux machines',
            onetSkills: ['Systems Analysis'],
            scenario:
              'You support a mixed office. A Linux server and a Windows desktop both lost network access. You need each machine’s current IP settings to start troubleshooting.',
            question: 'What do you do?',
            options: [
              {
                id: 'a',
                text: 'Run the network info command for each system (like ipconfig on Windows, ip addr on Linux)',
              },
              { id: 'b', text: 'Reinstall both operating systems' },
              { id: 'c', text: 'Use ipconfig on both, since all systems use the same commands' },
              { id: 'd', text: 'Swap the two machines’ network cables' },
            ],
            correctOptionId: 'a',
            explanation:
              'Each operating system has its own tool for showing network settings, and checking settings is always cheaper than reinstalling. Windows commands do not work on Linux.',
            level: 'applied',
          },
          {
            id: 'comptia-network-course-3-cp-2',
            courseSlug: 'comptia-network-course-3',
            programSlug: 'comptia-network-professional-certificate',
            demonstratedSkill: 'Isolate a bad network port or cable',
            onetSkills: ['Equipment Maintenance', 'Systems Analysis'],
            scenario:
              'One desk’s computer has no network link light. The same computer works fine when you plug it into the desk next to it.',
            question: 'What does this tell you?',
            options: [
              { id: 'a', text: 'The computer’s network card is broken' },
              { id: 'b', text: 'The problem is the first desk’s cable or wall port, not the computer' },
              { id: 'c', text: 'The user needs a new monitor' },
              { id: 'd', text: 'The whole office switch is dead' },
            ],
            correctOptionId: 'b',
            explanation:
              'Moving the computer to a working port is a swap test: since the computer works elsewhere, the fault is in the first desk’s cabling or port. A dead switch would take down every desk.',
            level: 'applied',
          },
        ],
      },
      {
        courseSlug: 'comptia-network-course-4',
        courseName: 'Introduction to Networking and Storage',
        programSlug: 'comptia-network-professional-certificate',
        checkpoints: [
          {
            id: 'comptia-network-course-4-cp-1',
            courseSlug: 'comptia-network-course-4',
            programSlug: 'comptia-network-professional-certificate',
            demonstratedSkill: 'Recommend shared storage for a team',
            onetSkills: ['Technology Design'],
            scenario:
              'A design team of eight keeps emailing big files to each other and losing track of the newest version. They want one shared place on the office network for files.',
            question: 'What do you recommend?',
            options: [
              { id: 'a', text: 'Network-attached storage (NAS) that everyone can access' },
              { id: 'b', text: 'A USB stick passed from desk to desk' },
              { id: 'c', text: 'Bigger email attachment limits' },
              { id: 'd', text: 'Each person keeps their own copy of every file' },
            ],
            correctOptionId: 'a',
            explanation:
              'A NAS gives the team one shared, always-on place for files, which solves both the emailing and the version confusion. USB sticks and personal copies make version problems worse.',
            level: 'applied',
          },
          {
            id: 'comptia-network-course-4-cp-2',
            courseSlug: 'comptia-network-course-4',
            programSlug: 'comptia-network-professional-certificate',
            demonstratedSkill: 'Protect shared files from drive failure',
            onetSkills: ['Operations Analysis'],
            scenario:
              'Your office file server has one hard drive with no backup. Your manager asks what happens if that drive dies, and what you would change.',
            question: 'What is the best answer?',
            options: [
              {
                id: 'a',
                text: 'All files would be lost — add regular backups and redundant drives (RAID)',
              },
              { id: 'b', text: 'Nothing would be lost, because servers never fail' },
              { id: 'c', text: 'Just buy a faster drive — speed prevents failure' },
              { id: 'd', text: 'Print all the files so there are paper copies' },
            ],
            correctOptionId: 'a',
            explanation:
              'One drive with no backup is a single point of failure: when it dies, everything on it is gone. Backups plus redundant drives protect the data; speed does not prevent failure.',
            level: 'applied',
          },
        ],
      },
      {
        courseSlug: 'comptia-network-course-5',
        courseName: 'Basics of Cisco Networking',
        programSlug: 'comptia-network-professional-certificate',
        checkpoints: [
          {
            id: 'comptia-network-course-5-cp-1',
            courseSlug: 'comptia-network-course-5',
            programSlug: 'comptia-network-professional-certificate',
            demonstratedSkill: 'Make a safe change to a network switch',
            onetSkills: ['Operations Analysis'],
            scenario:
              'You need to change a setting on the main office Cisco switch during business hours. If you make a mistake, the whole office could lose its connection.',
            question: 'What should you do before making the change?',
            options: [
              {
                id: 'a',
                text: 'Save a copy of the current configuration so you can restore it if something breaks',
              },
              { id: 'b', text: 'Make the change quickly so no one notices' },
              { id: 'c', text: 'Factory-reset the switch first for a clean start' },
              { id: 'd', text: 'Unplug the switch while you think about it' },
            ],
            correctOptionId: 'a',
            explanation:
              'Backing up the working configuration gives you a fast way to undo a mistake. A factory reset or unplugging the switch would cause the very outage you are trying to avoid.',
            level: 'applied',
          },
          {
            id: 'comptia-network-course-5-cp-2',
            courseSlug: 'comptia-network-course-5',
            programSlug: 'comptia-network-professional-certificate',
            demonstratedSkill: 'Practice risky network changes without risking the real network',
            onetSkills: ['Technology Design'],
            scenario:
              'Your team wants to redesign how the office network is laid out. You are nervous about testing ideas on live equipment that staff depend on.',
            question: 'What is the smart way to test the new design first?',
            options: [
              { id: 'a', text: 'Build and test it in a network simulator like Packet Tracer' },
              { id: 'b', text: 'Try the changes on the live network after lunch' },
              { id: 'c', text: 'Skip testing — designs on paper always work' },
              { id: 'd', text: 'Buy a full duplicate set of office equipment to test on' },
            ],
            correctOptionId: 'a',
            explanation:
              'Simulators let you build, break, and fix a network design for free before touching real equipment. Testing on the live network risks an outage, and duplicating hardware is needlessly expensive.',
            level: 'applied',
          },
        ],
      },
      {
        courseSlug: 'comptia-network-course-6',
        courseName: 'CCNA Foundations',
        programSlug: 'comptia-network-professional-certificate',
        checkpoints: [
          {
            id: 'comptia-network-course-6-cp-1',
            courseSlug: 'comptia-network-course-6',
            programSlug: 'comptia-network-professional-certificate',
            demonstratedSkill: 'Separate departments on one network for security',
            onetSkills: ['Systems Analysis'],
            scenario:
              'Your company’s HR files must stay private, but HR computers share the same network as guest Wi-Fi. Your manager asks how to separate them without new cabling.',
            question: 'What do you suggest?',
            options: [
              { id: 'a', text: 'Use VLANs to split the network into separate segments' },
              { id: 'b', text: 'Ask guests politely not to look at HR files' },
              { id: 'c', text: 'Turn off guest Wi-Fi permanently' },
              { id: 'd', text: 'Move HR to a different building' },
            ],
            correctOptionId: 'a',
            explanation:
              'VLANs split one physical network into isolated segments, so guest traffic cannot reach HR systems — no new cables needed. Killing guest Wi-Fi punishes visitors instead of fixing the design.',
            level: 'job_ready',
          },
          {
            id: 'comptia-network-course-6-cp-2',
            courseSlug: 'comptia-network-course-6',
            programSlug: 'comptia-network-professional-certificate',
            demonstratedSkill: 'Troubleshoot a network outage step by step',
            onetSkills: ['Complex Problem Solving', 'Systems Evaluation'],
            scenario:
              'At 9 a.m., one whole floor loses network access. Other floors are fine. Each floor connects through its own switch to the building’s core router.',
            question: 'Where do you start looking?',
            options: [
              { id: 'a', text: 'The internet provider’s connection' },
              { id: 'b', text: 'That floor’s switch and its link to the core router' },
              { id: 'c', text: 'One user’s laptop on the affected floor' },
              { id: 'd', text: 'The core router, since it is the most important device' },
            ],
            correctOptionId: 'b',
            explanation:
              'The outage matches one floor exactly, which points to the device that serves only that floor — its switch or uplink. A core router or provider failure would affect every floor.',
            level: 'job_ready',
          },
        ],
      },
      {
        courseSlug: 'comptia-network-course-7',
        courseName: 'TCP/IP and Advanced Topics',
        programSlug: 'comptia-network-professional-certificate',
        checkpoints: [
          {
            id: 'comptia-network-course-7-cp-1',
            courseSlug: 'comptia-network-course-7',
            programSlug: 'comptia-network-professional-certificate',
            demonstratedSkill: 'Diagnose a DNS problem',
            onetSkills: ['Troubleshooting', 'Operations Analysis'],
            scenario:
              'Users say "the internet is down." You test: websites fail by name (like example.com), but you can reach the same sites by typing their IP address directly.',
            question: 'What is broken?',
            options: [
              { id: 'a', text: 'The physical network cables' },
              { id: 'b', text: 'DNS — the service that turns names into addresses' },
              { id: 'c', text: 'Every website on the internet at once' },
              { id: 'd', text: 'The users’ keyboards' },
            ],
            correctOptionId: 'b',
            explanation:
              'Reaching sites by IP but not by name means the connection works but name lookup (DNS) is failing. Broken cables would block IP access too.',
            level: 'job_ready',
          },
          {
            id: 'comptia-network-course-7-cp-2',
            courseSlug: 'comptia-network-course-7',
            programSlug: 'comptia-network-professional-certificate',
            demonstratedSkill: 'Use a packet capture tool to find a network slowdown',
            onetSkills: ['Operations Analysis', 'Technology Design'],
            scenario:
              'The office network gets very slow every afternoon. Your manager wants proof of what is causing it, not a guess.',
            question: 'How do you get evidence?',
            options: [
              {
                id: 'a',
                text: 'Capture and review network traffic with a tool like Wireshark during the slowdown',
              },
              { id: 'b', text: 'Restart the router every afternoon and call it fixed' },
              { id: 'c', text: 'Ask users what they think is wrong and report their guesses' },
              { id: 'd', text: 'Replace all the network cables in the building' },
            ],
            correctOptionId: 'a',
            explanation:
              'A packet capture shows exactly what traffic floods the network and from where — real evidence you can act on. Restarting hides the cause, and guesses are not proof.',
            level: 'job_ready',
          },
        ],
      },
      {
        courseSlug: 'comptia-network-course-8',
        courseName: 'Operating Systems and Networking Fundamentals',
        programSlug: 'comptia-network-professional-certificate',
        checkpoints: [
          {
            id: 'comptia-network-course-8-cp-1',
            courseSlug: 'comptia-network-course-8',
            programSlug: 'comptia-network-professional-certificate',
            demonstratedSkill: 'Restore a failed service on a server',
            onetSkills: ['Troubleshooting', 'Systems Analysis'],
            scenario:
              'Staff cannot open shared files. You log into the Windows file server and see it is running, but the file-sharing service shows as "stopped."',
            question: 'What do you do first?',
            options: [
              { id: 'a', text: 'Start the stopped service, then check the logs for why it stopped' },
              { id: 'b', text: 'Reboot every computer in the office' },
              { id: 'c', text: 'Reinstall the server operating system' },
              { id: 'd', text: 'Tell staff to save files on their own desktops from now on' },
            ],
            correctOptionId: 'a',
            explanation:
              'Starting the service restores work fastest, and the logs tell you whether it will happen again. Rebooting clients or reinstalling the server does not touch the stopped service.',
            level: 'job_ready',
          },
          {
            id: 'comptia-network-course-8-cp-2',
            courseSlug: 'comptia-network-course-8',
            programSlug: 'comptia-network-professional-certificate',
            demonstratedSkill: 'Troubleshoot one user who cannot connect when everyone else can',
            onetSkills: ['Troubleshooting'],
            scenario:
              'One Linux workstation cannot reach the network. Everyone else is fine. You run its network command and see it has a strange "self-assigned" address instead of a normal office one.',
            question: 'What does that usually mean?',
            options: [
              {
                id: 'a',
                text: 'The machine could not reach the DHCP server to get a real address',
              },
              { id: 'b', text: 'The machine has been hacked' },
              { id: 'c', text: 'Linux does not support networking' },
              { id: 'd', text: 'The user typed their password wrong' },
            ],
            correctOptionId: 'a',
            explanation:
              'A self-assigned address is the machine’s fallback when no DHCP server answers — so check its cable, port, or DHCP service. It is a connection symptom, not a hack or password issue.',
            level: 'job_ready',
          },
        ],
      },
      {
        courseSlug: 'comptia-network-course-9',
        courseName: 'Network Foundations and Addressing',
        programSlug: 'comptia-network-professional-certificate',
        checkpoints: [
          {
            id: 'comptia-network-course-9-cp-1',
            courseSlug: 'comptia-network-course-9',
            programSlug: 'comptia-network-professional-certificate',
            demonstratedSkill: 'Spot why two devices cannot talk on the same network',
            onetSkills: ['Systems Analysis', 'Technology Design'],
            scenario:
              'A new printer was set up with IP 192.168.2.50, but every office computer uses 192.168.1.x addresses. Computers cannot find the printer.',
            question: 'What is the likely problem?',
            options: [
              {
                id: 'a',
                text: 'The printer is on a different network range than the computers',
              },
              { id: 'b', text: 'The printer is out of paper' },
              { id: 'c', text: 'The computers need new web browsers' },
              { id: 'd', text: 'Printers cannot use IP addresses' },
            ],
            correctOptionId: 'a',
            explanation:
              'Devices on 192.168.1.x and 192.168.2.x are on different network ranges, so they cannot reach each other directly. Fix the printer’s address to match the office range.',
            level: 'job_ready',
          },
          {
            id: 'comptia-network-course-9-cp-2',
            courseSlug: 'comptia-network-course-9',
            programSlug: 'comptia-network-professional-certificate',
            demonstratedSkill: 'Plan address space when splitting a network',
            onetSkills: ['Mathematics', 'Technology Design'],
            scenario:
              'Your manager wants the office network split into two parts: one for 20 staff computers and one for 10 security cameras, so camera traffic stays separate.',
            question: 'What is the right approach?',
            options: [
              {
                id: 'a',
                text: 'Create two subnets, each sized with room for its devices to grow',
              },
              { id: 'b', text: 'Put everything on one subnet but ask the cameras to use less data' },
              { id: 'c', text: 'Give the cameras no IP addresses at all' },
              { id: 'd', text: 'Make 30 separate subnets, one per device' },
            ],
            correctOptionId: 'a',
            explanation:
              'Two right-sized subnets keep camera traffic separate from staff traffic and leave room to grow. One subnet does not separate anything, and one subnet per device is unmanageable.',
            level: 'job_ready',
          },
        ],
      },
    ],
  },

  // ==========================================================================
  // CompTIA Security+ Professional Certificate
  // ==========================================================================
  {
    programSlug: 'comptia-security-professional-certificate',
    programTitle: 'CompTIA Security+ Professional Certificate',
    whyItMatters:
      'These checkpoints show employers you can spot and respond to real security threats on day one.',
    courses: [
      {
        courseSlug: 'comptia-security-course-1',
        courseName: 'Network Security Fundamentals',
        programSlug: 'comptia-security-professional-certificate',
        checkpoints: [
          {
            id: 'comptia-security-course-1-cp-1',
            courseSlug: 'comptia-security-course-1',
            programSlug: 'comptia-security-professional-certificate',
            demonstratedSkill: 'Protect remote workers connecting to the office',
            onetSkills: ['Technology Design'],
            scenario:
              'Your company is letting staff work from home. They will connect to office systems from home Wi-Fi and coffee shops. Your manager asks how to keep those connections safe.',
            question: 'What do you recommend?',
            options: [
              { id: 'a', text: 'Require a VPN so all remote traffic is encrypted' },
              { id: 'b', text: 'Tell staff to only use coffee shops with nice reviews' },
              { id: 'c', text: 'Email everyone the server passwords so they can log in directly' },
              { id: 'd', text: 'Block all remote work as too risky' },
            ],
            correctOptionId: 'a',
            explanation:
              'A VPN encrypts traffic between the worker and the office, so even public Wi-Fi is safe to use. Emailing passwords creates the exact risk you are trying to prevent.',
            level: 'foundation',
          },
          {
            id: 'comptia-security-course-1-cp-2',
            courseSlug: 'comptia-security-course-1',
            programSlug: 'comptia-security-professional-certificate',
            demonstratedSkill: 'Use a firewall to reduce attack risk',
            onetSkills: ['Systems Evaluation', 'Technology Design'],
            scenario:
              'A security scan shows your office firewall allows incoming connections on dozens of ports, but the company only runs a website and email.',
            question: 'What should you do?',
            options: [
              {
                id: 'a',
                text: 'Close every port the business does not actually need',
              },
              { id: 'b', text: 'Leave them open in case someone needs them someday' },
              { id: 'c', text: 'Open more ports so traffic flows faster' },
              { id: 'd', text: 'Turn the firewall off, since it is misconfigured anyway' },
            ],
            correctOptionId: 'a',
            explanation:
              'Every open port is a possible way in, so allow only what the business needs. "Just in case" openings are exactly what attackers scan for.',
            level: 'foundation',
          },
        ],
      },
      {
        courseSlug: 'comptia-security-course-2',
        courseName: 'Security Threats and Vulnerabilities',
        programSlug: 'comptia-security-professional-certificate',
        checkpoints: [
          {
            id: 'comptia-security-course-2-cp-1',
            courseSlug: 'comptia-security-course-2',
            programSlug: 'comptia-security-professional-certificate',
            demonstratedSkill: 'Recognize a social engineering attack',
            onetSkills: ['Judgment and Decision Making'],
            scenario:
              'You get a call: "This is Dave from IT headquarters. There’s an emergency — I need your login right now or payroll fails tonight." You have never heard of Dave.',
            question: 'What do you do?',
            options: [
              { id: 'a', text: 'Give him the login — payroll is important' },
              {
                id: 'b',
                text: 'Refuse, hang up, and verify through a known company number, then report the call',
              },
              { id: 'c', text: 'Give him an old password instead of your current one' },
              { id: 'd', text: 'Ask him to call back after lunch' },
            ],
            correctOptionId: 'b',
            explanation:
              'Urgency plus a request for credentials is the classic social engineering pattern — real IT staff never need your password. Verify through a channel you trust and report it so others are warned.',
            level: 'applied',
          },
          {
            id: 'comptia-security-course-2-cp-2',
            courseSlug: 'comptia-security-course-2',
            programSlug: 'comptia-security-professional-certificate',
            demonstratedSkill: 'Prioritize which security holes to fix first',
            onetSkills: ['Systems Analysis', 'Judgment and Decision Making'],
            scenario:
              'A vulnerability scan of your company finds 40 issues. One is a critical flaw on the public web server that attackers are actively exploiting elsewhere. The rest are low-risk items on internal machines.',
            question: 'What do you fix first?',
            options: [
              { id: 'a', text: 'The critical flaw on the public-facing web server' },
              { id: 'b', text: 'The low-risk items, because there are more of them' },
              { id: 'c', text: 'Whatever is alphabetically first in the report' },
              { id: 'd', text: 'Nothing until next quarter’s budget meeting' },
            ],
            correctOptionId: 'a',
            explanation:
              'Risk is about severity and exposure: a critical, internet-facing, actively exploited flaw can be attacked today. Fixing many small items while the front door is open protects nothing.',
            level: 'applied',
          },
        ],
      },
      {
        courseSlug: 'comptia-security-course-3',
        courseName: 'System Hardening and Endpoint Security',
        programSlug: 'comptia-security-professional-certificate',
        checkpoints: [
          {
            id: 'comptia-security-course-3-cp-1',
            courseSlug: 'comptia-security-course-3',
            programSlug: 'comptia-security-professional-certificate',
            demonstratedSkill: 'Harden a new computer before giving it to an employee',
            onetSkills: ['Systems Evaluation'],
            scenario:
              'You are setting up a new laptop for a new hire. It arrived with default settings, an administrator account with no password, and several trial apps installed.',
            question: 'Which setup is correct?',
            options: [
              {
                id: 'a',
                text: 'Set strong passwords, remove unneeded apps, apply updates, and give the user a standard (non-admin) account',
              },
              { id: 'b', text: 'Hand it over as-is so the new hire can start quickly' },
              { id: 'c', text: 'Give the user the admin account so they never need IT help' },
              { id: 'd', text: 'Just install antivirus — that covers everything' },
            ],
            correctOptionId: 'a',
            explanation:
              'Hardening means closing the easy doors: passwords, updates, removing extra software, and least-privilege accounts. Antivirus alone cannot protect a machine with an open admin account.',
            level: 'applied',
          },
          {
            id: 'comptia-security-course-3-cp-2',
            courseSlug: 'comptia-security-course-3',
            programSlug: 'comptia-security-professional-certificate',
            demonstratedSkill: 'Respond to a ransomware warning on one machine',
            onetSkills: ['Operations Analysis', 'Systems Evaluation'],
            scenario:
              'Your endpoint protection alerts that one office computer is encrypting files unusually fast — a ransomware pattern. The user is at lunch. The machine is connected to shared drives.',
            question: 'What is your immediate move?',
            options: [
              {
                id: 'a',
                text: 'Isolate that machine from the network now, then investigate and report',
              },
              { id: 'b', text: 'Wait for the user to come back and ask what they clicked' },
              { id: 'c', text: 'Delete the alert — it is probably a false alarm' },
              { id: 'd', text: 'Restart the machine and see if the alert goes away' },
            ],
            correctOptionId: 'a',
            explanation:
              'Ransomware spreads to shared drives within minutes, so cutting the machine off the network limits the damage immediately. Waiting or dismissing the alert lets it encrypt everything it can reach.',
            level: 'job_ready',
          },
        ],
      },
      {
        courseSlug: 'comptia-security-course-4',
        courseName: 'Cryptography and Secure Communications',
        programSlug: 'comptia-security-professional-certificate',
        checkpoints: [
          {
            id: 'comptia-security-course-4-cp-1',
            courseSlug: 'comptia-security-course-4',
            programSlug: 'comptia-security-professional-certificate',
            demonstratedSkill: 'Send sensitive data safely',
            onetSkills: ['Technology Design', 'Operations Analysis'],
            scenario:
              'The HR manager needs to send a file of employee Social Security numbers to the company’s payroll provider. She asks if regular email is okay.',
            question: 'What do you tell her?',
            options: [
              {
                id: 'a',
                text: 'No — use an encrypted transfer method the payroll provider supports',
              },
              { id: 'b', text: 'Yes, email is fine if the subject line says "confidential"' },
              { id: 'c', text: 'Yes, as long as she deletes the email afterward' },
              { id: 'd', text: 'Print it and send it by regular mail instead' },
            ],
            correctOptionId: 'a',
            explanation:
              'Plain email is not encrypted end to end, so sensitive data needs an encrypted channel. Labels and deleting your copy do nothing to protect the data in transit.',
            level: 'job_ready',
          },
          {
            id: 'comptia-security-course-4-cp-2',
            courseSlug: 'comptia-security-course-4',
            programSlug: 'comptia-security-professional-certificate',
            demonstratedSkill: 'Handle a website certificate warning correctly',
            onetSkills: ['Operations Analysis'],
            scenario:
              'A coworker is about to log in to the company’s vendor portal, but her browser shows a big warning: "Your connection is not private — certificate invalid." She asks if she should click past it.',
            question: 'What is the right advice?',
            options: [
              {
                id: 'a',
                text: 'Do not log in — the warning means the connection cannot be trusted, so report it to IT',
              },
              { id: 'b', text: 'Click past it — those warnings are always wrong' },
              { id: 'c', text: 'Log in quickly before the warning comes back' },
              { id: 'd', text: 'Try a different browser until the warning disappears' },
            ],
            correctOptionId: 'a',
            explanation:
              'A certificate warning means the browser cannot prove the site is real — entering a password there could hand it to an attacker. Switching browsers just hides the same risk.',
            level: 'job_ready',
          },
        ],
      },
    ],
  },

  // ==========================================================================
  // IT Support Professional Certificate (IBM)
  // ==========================================================================
  {
    programSlug: 'it-support-professional-certificate-ibm',
    programTitle: 'IT Support Professional Certificate',
    whyItMatters:
      'These checkpoints prove you can handle real help desk tickets — the core of an IT support job.',
    courses: [
      {
        courseSlug: 'it-support-course-1',
        courseName: 'Introduction to Technical Support',
        programSlug: 'it-support-professional-certificate-ibm',
        checkpoints: [
          {
            id: 'it-support-course-1-cp-1',
            courseSlug: 'it-support-course-1',
            programSlug: 'it-support-professional-certificate-ibm',
            demonstratedSkill: 'Calm and help a frustrated user',
            onetSkills: ['Service Orientation', 'Social Perceptiveness'],
            scenario:
              'A caller is angry: "This is the third time I’ve called about my email! Nobody ever fixes it!" You were not involved in the earlier calls.',
            question: 'What is the best way to start?',
            options: [
              { id: 'a', text: 'Explain that the earlier calls were not your fault' },
              {
                id: 'b',
                text: 'Acknowledge the frustration, then ask questions to understand the problem fully',
              },
              { id: 'c', text: 'Transfer the call so someone else deals with it' },
              { id: 'd', text: 'Tell them to submit a written ticket instead of calling' },
            ],
            correctOptionId: 'b',
            explanation:
              'Acknowledging the frustration lowers the temperature so you can actually solve the problem. Defending yourself or passing the caller along makes an angry customer angrier.',
            level: 'foundation',
          },
          {
            id: 'it-support-course-1-cp-2',
            courseSlug: 'it-support-course-1',
            programSlug: 'it-support-professional-certificate-ibm',
            demonstratedSkill: 'Write a useful help desk ticket',
            onetSkills: ['Speaking', 'Service Orientation'],
            scenario:
              'You could not fix a user’s problem on the first call and must pass the ticket to the next shift. You are writing the ticket notes.',
            question: 'What should the notes include?',
            options: [
              { id: 'a', text: 'Just "user has a problem, please call them"' },
              {
                id: 'b',
                text: 'The symptoms, what you already tried, the results, and the user’s contact info',
              },
              { id: 'c', text: 'Your opinion that the user probably broke it themselves' },
              { id: 'd', text: 'Nothing — the next person should start fresh' },
            ],
            correctOptionId: 'b',
            explanation:
              'Good notes let the next technician continue instead of repeating your work — which is faster for the user too. Empty or blaming notes waste everyone’s time.',
            level: 'foundation',
          },
        ],
      },
      {
        courseSlug: 'it-support-course-2',
        courseName: 'Introduction to Hardware and Operating Systems',
        programSlug: 'it-support-professional-certificate-ibm',
        checkpoints: [
          {
            id: 'it-support-course-2-cp-1',
            courseSlug: 'it-support-course-2',
            programSlug: 'it-support-professional-certificate-ibm',
            demonstratedSkill: 'Troubleshoot a blank monitor',
            onetSkills: ['Troubleshooting'],
            scenario:
              'A ticket says: "My screen is black but I can hear the computer running." You arrive and confirm the computer fans are on, but the monitor shows nothing.',
            question: 'What do you check first?',
            options: [
              {
                id: 'a',
                text: 'That the monitor is powered on and its video cable is firmly connected',
              },
              { id: 'b', text: 'Whether the hard drive needs replacing' },
              { id: 'c', text: 'The user’s email settings' },
              { id: 'd', text: 'Whether the office Wi-Fi is down' },
            ],
            correctOptionId: 'a',
            explanation:
              'When the computer runs but shows nothing, the simplest causes are monitor power and the video cable — check the cheap, common things first. Drives, email, and Wi-Fi cannot blank a screen.',
            level: 'foundation',
          },
          {
            id: 'it-support-course-2-cp-2',
            courseSlug: 'it-support-course-2',
            programSlug: 'it-support-professional-certificate-ibm',
            demonstratedSkill: 'Diagnose a computer that overheats and shuts down',
            onetSkills: ['Equipment Maintenance', 'Troubleshooting'],
            scenario:
              'A user’s desktop shuts itself off after about an hour of use, every day. You notice the case vents are caked with dust and the fan is barely spinning.',
            question: 'What is the most likely fix?',
            options: [
              { id: 'a', text: 'Clean the dust and fix or replace the cooling fan' },
              { id: 'b', text: 'Reinstall the operating system' },
              { id: 'c', text: 'Tell the user to work in shorter shifts' },
              { id: 'd', text: 'Increase the screen brightness' },
            ],
            correctOptionId: 'a',
            explanation:
              'Computers shut down to protect themselves from overheating, and blocked vents with a weak fan are the classic cause. Software reinstalls do not cool down hardware.',
            level: 'applied',
          },
        ],
      },
      {
        courseSlug: 'it-support-course-3',
        courseName: 'Introduction to Software, Programming, and Databases',
        programSlug: 'it-support-professional-certificate-ibm',
        checkpoints: [
          {
            id: 'it-support-course-3-cp-1',
            courseSlug: 'it-support-course-3',
            programSlug: 'it-support-professional-certificate-ibm',
            demonstratedSkill: 'Pull the right information from a database',
            onetSkills: ['Database Management'],
            scenario:
              'Your manager asks for a list of all support tickets opened this month that are still unresolved. The data lives in the ticketing database’s tickets table.',
            question: 'How do you get the list?',
            options: [
              {
                id: 'a',
                text: 'Run a SQL query that filters tickets by this month’s dates and "open" status',
              },
              { id: 'b', text: 'Scroll through every ticket by hand and copy them into an email' },
              { id: 'c', text: 'Delete the closed tickets so only open ones remain' },
              { id: 'd', text: 'Guess the number based on how busy the month felt' },
            ],
            correctOptionId: 'a',
            explanation:
              'A SQL query with the right filters returns the exact list in seconds and can be reused next month. Deleting records to "filter" them destroys company data.',
            level: 'applied',
          },
          {
            id: 'it-support-course-3-cp-2',
            courseSlug: 'it-support-course-3',
            programSlug: 'it-support-professional-certificate-ibm',
            demonstratedSkill: 'Automate a boring repeated task with a script',
            onetSkills: ['Programming'],
            scenario:
              'Every Friday you spend two hours renaming and sorting hundreds of report files into folders by date. The steps are exactly the same every week.',
            question: 'What is the best long-term move?',
            options: [
              { id: 'a', text: 'Write a small Python script that does the renaming and sorting' },
              { id: 'b', text: 'Keep doing it by hand — that way you know it is right' },
              { id: 'c', text: 'Ask a coworker to split the manual work with you' },
              { id: 'd', text: 'Stop sorting the files at all' },
            ],
            correctOptionId: 'a',
            explanation:
              'A repeated task with fixed steps is exactly what scripts are for — the script does it in seconds and never gets tired. Splitting manual work still wastes two human hours.',
            level: 'applied',
          },
        ],
      },
      {
        courseSlug: 'it-support-course-4',
        courseName: 'Introduction to Networking and Storage',
        programSlug: 'it-support-professional-certificate-ibm',
        checkpoints: [
          {
            id: 'it-support-course-4-cp-1',
            courseSlug: 'it-support-course-4',
            programSlug: 'it-support-professional-certificate-ibm',
            demonstratedSkill: 'Narrow down a "no internet" complaint',
            onetSkills: ['Troubleshooting'],
            scenario:
              'A user reports "no internet." You ask one question to figure out the size of the problem before walking over.',
            question: 'Which question narrows it down fastest?',
            options: [
              { id: 'a', text: '"Is anyone sitting near you also having the problem?"' },
              { id: 'b', text: '"What color is your computer?"' },
              { id: 'c', text: '"When did you last change your wallpaper?"' },
              { id: 'd', text: '"Have you tried buying a new laptop?"' },
            ],
            correctOptionId: 'a',
            explanation:
              'Knowing whether one person or many are affected tells you if the fault is in her machine or in shared equipment — and that decides everything you do next.',
            level: 'applied',
          },
          {
            id: 'it-support-course-4-cp-2',
            courseSlug: 'it-support-course-4',
            programSlug: 'it-support-professional-certificate-ibm',
            demonstratedSkill: 'Help a user whose disk is full',
            onetSkills: ['Operations Analysis', 'Technology Design'],
            scenario:
              'A user gets "disk full" warnings. You find her laptop drive packed with years of large video files she rarely opens but cannot lose.',
            question: 'What do you suggest?',
            options: [
              {
                id: 'a',
                text: 'Move the old videos to approved cloud or network storage, freeing the laptop drive',
              },
              { id: 'b', text: 'Delete the videos — she probably will not notice' },
              { id: 'c', text: 'Ignore the warnings; they go away eventually' },
              { id: 'd', text: 'Email the videos to herself to store them in her inbox' },
            ],
            correctOptionId: 'a',
            explanation:
              'Cloud or network storage keeps rarely used files safe while freeing local space — the standard fix. Deleting risks her data, and inboxes are not built to hold huge files.',
            level: 'applied',
          },
        ],
      },
      {
        courseSlug: 'it-support-course-5',
        courseName: 'Introduction to Cybersecurity Essentials',
        programSlug: 'it-support-professional-certificate-ibm',
        checkpoints: [
          {
            id: 'it-support-course-5-cp-1',
            courseSlug: 'it-support-course-5',
            programSlug: 'it-support-professional-certificate-ibm',
            demonstratedSkill: 'Spot a phishing email before it does damage',
            onetSkills: ['Judgment and Decision Making'],
            scenario:
              'A user forwards you an email: "Your paycheck is on hold! Verify your bank details here within 24 hours." The sender address is payroll@c0mpany-pay.net — not the company domain.',
            question: 'What do you tell the user?',
            options: [
              {
                id: 'a',
                text: 'It is a phishing attempt — do not click, and report it to security',
              },
              { id: 'b', text: 'Click the link quickly so the paycheck is not delayed' },
              { id: 'c', text: 'Reply to the sender asking if they are legitimate' },
              { id: 'd', text: 'Forward it to coworkers to ask if they got it too' },
            ],
            correctOptionId: 'a',
            explanation:
              'A fake lookalike sender plus urgency plus a request for bank details is textbook phishing. Replying or forwarding spreads the risk — reporting protects everyone.',
            level: 'applied',
          },
          {
            id: 'it-support-course-5-cp-2',
            courseSlug: 'it-support-course-5',
            programSlug: 'it-support-professional-certificate-ibm',
            demonstratedSkill: 'Decide what to do with a found USB drive',
            onetSkills: ['Judgment and Decision Making', 'Systems Evaluation'],
            scenario:
              'A coworker finds a USB drive in the parking lot labeled "Salaries 2026" and brings it to you, curious to see what is on it.',
            question: 'What do you do?',
            options: [
              {
                id: 'a',
                text: 'Do not plug it into any company computer — hand it to the security team',
              },
              { id: 'b', text: 'Plug it into your work computer to find the owner' },
              { id: 'c', text: 'Plug it into the manager’s computer since hers has antivirus' },
              { id: 'd', text: 'Throw it away without telling anyone' },
            ],
            correctOptionId: 'a',
            explanation:
              'Dropped USB drives with tempting labels are a known attack — plugging one in can infect the machine instantly, and antivirus may not catch it. Security teams have safe ways to inspect it.',
            level: 'applied',
          },
        ],
      },
      {
        courseSlug: 'it-support-course-6',
        courseName: 'Introduction to Cloud Computing',
        programSlug: 'it-support-professional-certificate-ibm',
        checkpoints: [
          {
            id: 'it-support-course-6-cp-1',
            courseSlug: 'it-support-course-6',
            programSlug: 'it-support-professional-certificate-ibm',
            demonstratedSkill: 'Explain when cloud beats buying servers',
            onetSkills: ['Technology Design', 'Systems Analysis'],
            scenario:
              'Your small company needs a new application server, but only for a six-month project. The owner asks whether to buy a server or use a cloud provider.',
            question: 'What is the strongest reason to choose cloud here?',
            options: [
              {
                id: 'a',
                text: 'You pay only while you use it and can shut it off when the project ends',
              },
              { id: 'b', text: 'Cloud servers never have outages' },
              { id: 'c', text: 'Cloud is always cheaper than hardware in every situation' },
              { id: 'd', text: 'A purchased server cannot run applications' },
            ],
            correctOptionId: 'a',
            explanation:
              'For short-term needs, pay-as-you-go wins: no hardware to buy, own, and resell after six months. Cloud is not always cheaper and does have outages — the honest case is flexibility.',
            level: 'applied',
          },
          {
            id: 'it-support-course-6-cp-2',
            courseSlug: 'it-support-course-6',
            programSlug: 'it-support-professional-certificate-ibm',
            demonstratedSkill: 'Support a user locked out of a cloud app',
            onetSkills: ['Systems Analysis'],
            scenario:
              'A user cannot log in to the company’s cloud email. Her password is correct, but the app says "account locked after too many attempts." She has a presentation in 30 minutes.',
            question: 'What is the fastest correct fix?',
            options: [
              {
                id: 'a',
                text: 'Use the admin console to unlock her account, after confirming her identity',
              },
              { id: 'b', text: 'Tell her to create a brand-new email account' },
              { id: 'c', text: 'Tell her to keep trying the password until it works' },
              { id: 'd', text: 'Reinstall the operating system on her laptop' },
            ],
            correctOptionId: 'a',
            explanation:
              'Cloud apps have admin consoles for exactly this — unlock the account after verifying who she is. Retrying extends the lockout, and the problem is in the cloud account, not her laptop.',
            level: 'applied',
          },
        ],
      },
      {
        courseSlug: 'it-support-course-7',
        courseName: 'Technical Support Case Studies and Capstone Project',
        programSlug: 'it-support-professional-certificate-ibm',
        checkpoints: [
          {
            id: 'it-support-course-7-cp-1',
            courseSlug: 'it-support-course-7',
            programSlug: 'it-support-professional-certificate-ibm',
            demonstratedSkill: 'Triage multiple urgent tickets at once',
            onetSkills: ['Complex Problem Solving', 'Service Orientation'],
            scenario:
              'Three tickets arrive together: (1) the CEO’s screen wallpaper looks wrong, (2) the sales team of 12 cannot access the order system during business hours, (3) a printer is low on toner.',
            question: 'Which do you handle first?',
            options: [
              { id: 'a', text: 'The CEO’s wallpaper — most senior person first' },
              { id: 'b', text: 'The sales team’s order system — most people and money blocked' },
              { id: 'c', text: 'The toner — it is the quickest fix' },
              { id: 'd', text: 'Whichever ticket arrived first' },
            ],
            correctOptionId: 'b',
            explanation:
              'Triage by business impact: twelve people unable to take orders costs real money every minute. Seniority and arrival order matter less than how much work is blocked.',
            level: 'job_ready',
          },
          {
            id: 'it-support-course-7-cp-2',
            courseSlug: 'it-support-course-7',
            programSlug: 'it-support-professional-certificate-ibm',
            demonstratedSkill: 'Know when and how to escalate a problem',
            onetSkills: ['Complex Problem Solving', 'Service Orientation'],
            scenario:
              'You have spent 45 minutes on a ticket and tried everything you know. The user is patient but needs the system today. Your team has a senior engineer on call.',
            question: 'What is the professional move?',
            options: [
              {
                id: 'a',
                text: 'Escalate to the senior engineer with full notes on what you tried',
              },
              { id: 'b', text: 'Keep trying alone for the rest of the day — asking for help looks bad' },
              { id: 'c', text: 'Close the ticket as "cannot reproduce"' },
              { id: 'd', text: 'Tell the user the problem is unfixable' },
            ],
            correctOptionId: 'a',
            explanation:
              'Escalating with good notes gets the user helped fastest and is exactly how support teams are designed to work. Hiding a stuck ticket or closing it falsely hurts the user and your credibility.',
            level: 'job_ready',
          },
        ],
      },
    ],
  },

  // ==========================================================================
  // AWS Cloud Technology (Amazon)
  // ==========================================================================
  {
    programSlug: 'aws-cloud-technology-amazon',
    programTitle: 'AWS Cloud Technology',
    whyItMatters:
      'These checkpoints show employers you can work safely and confidently inside a real AWS account.',
    courses: [
      {
        courseSlug: 'aws-course-1',
        courseName: 'Introduction to Information Technology and AWS Cloud',
        programSlug: 'aws-cloud-technology-amazon',
        checkpoints: [
          {
            id: 'aws-course-1-cp-1',
            courseSlug: 'aws-course-1',
            programSlug: 'aws-cloud-technology-amazon',
            demonstratedSkill: 'Pick the right AWS service for the job',
            onetSkills: ['Technology Design'],
            scenario:
              'Your team needs two things in AWS: a virtual server to run an application, and a place to store thousands of image files cheaply.',
            question: 'Which services match those needs?',
            options: [
              { id: 'a', text: 'EC2 for the server, S3 for the image storage' },
              { id: 'b', text: 'S3 for the server, EC2 for the storage' },
              { id: 'c', text: 'Two EC2 servers — one for each task' },
              { id: 'd', text: 'Neither — AWS cannot store files' },
            ],
            correctOptionId: 'a',
            explanation:
              'EC2 provides virtual servers for running applications; S3 is object storage built for files at low cost. Using a server just to hold images costs more and works worse than S3.',
            level: 'foundation',
          },
          {
            id: 'aws-course-1-cp-2',
            courseSlug: 'aws-course-1',
            programSlug: 'aws-cloud-technology-amazon',
            demonstratedSkill: 'Avoid surprise cloud bills',
            onetSkills: ['Systems Analysis'],
            scenario:
              'You launched a large EC2 server for a one-day test on Friday. On Monday you remember it might still be running, charging the company by the hour.',
            question: 'What do you do?',
            options: [
              {
                id: 'a',
                text: 'Check the console now and stop or terminate the instance if it is still running',
              },
              { id: 'b', text: 'Wait until the monthly bill arrives to see if it mattered' },
              { id: 'c', text: 'Nothing — AWS stops unused servers automatically' },
              { id: 'd', text: 'Delete your AWS login so the charges stop' },
            ],
            correctOptionId: 'a',
            explanation:
              'EC2 charges for every hour an instance runs, whether used or not, and AWS will not stop it for you. Checking immediately limits the waste; waiting for the bill just makes it bigger.',
            level: 'foundation',
          },
        ],
      },
      {
        courseSlug: 'aws-course-2',
        courseName: 'Providing Technical Support for AWS Workloads',
        programSlug: 'aws-cloud-technology-amazon',
        checkpoints: [
          {
            id: 'aws-course-2-cp-1',
            courseSlug: 'aws-course-2',
            programSlug: 'aws-cloud-technology-amazon',
            demonstratedSkill: 'Use CloudWatch to investigate a slow application',
            onetSkills: ['Troubleshooting', 'Operations Analysis'],
            scenario:
              'Customers say the company app is very slow. The app runs on an EC2 instance. You open CloudWatch and see the instance’s CPU has been at 100% for two hours.',
            question: 'What does this tell you?',
            options: [
              {
                id: 'a',
                text: 'The server is overloaded — investigate the cause and consider a bigger instance or more instances',
              },
              { id: 'b', text: 'Customers are imagining the slowness' },
              { id: 'c', text: '100% CPU means the server is healthy and fully used' },
              { id: 'd', text: 'The problem must be the customers’ internet' },
            ],
            correctOptionId: 'a',
            explanation:
              'A CPU pinned at 100% means the server cannot keep up with demand, which matches the slowness customers feel. Metrics like this are how you turn complaints into evidence.',
            level: 'applied',
          },
          {
            id: 'aws-course-2-cp-2',
            courseSlug: 'aws-course-2',
            programSlug: 'aws-cloud-technology-amazon',
            demonstratedSkill: 'Find out who changed a cloud setting',
            onetSkills: ['Operations Analysis', 'Troubleshooting'],
            scenario:
              'A security group rule was changed last night and broke the app. Your manager asks who made the change and when, so the team can fix the process.',
            question: 'Where do you look?',
            options: [
              { id: 'a', text: 'CloudTrail, which records who made each API change and when' },
              { id: 'b', text: 'Ask everyone on the team and trust their memory' },
              { id: 'c', text: 'There is no way to know — cloud changes are anonymous' },
              { id: 'd', text: 'The company’s email archive' },
            ],
            correctOptionId: 'a',
            explanation:
              'CloudTrail logs every account action with the user, time, and details — it exists exactly for this question. Memory and email are unreliable; the audit log is the source of truth.',
            level: 'applied',
          },
        ],
      },
      {
        courseSlug: 'aws-course-3',
        courseName: 'Developing Applications in Python on AWS',
        programSlug: 'aws-cloud-technology-amazon',
        checkpoints: [
          {
            id: 'aws-course-3-cp-1',
            courseSlug: 'aws-course-3',
            programSlug: 'aws-cloud-technology-amazon',
            demonstratedSkill: 'Debug a failing Lambda function',
            onetSkills: ['Programming', 'Systems Analysis'],
            scenario:
              'Your Python Lambda function worked yesterday but now every run fails. You have not looked at any error details yet.',
            question: 'What is your first step?',
            options: [
              {
                id: 'a',
                text: 'Read the function’s CloudWatch logs to see the actual error message',
              },
              { id: 'b', text: 'Rewrite the whole function from scratch' },
              { id: 'c', text: 'Run it again a few more times to see if it fixes itself' },
              { id: 'd', text: 'Increase the function’s memory — that fixes most things' },
            ],
            correctOptionId: 'a',
            explanation:
              'The logs contain the exact error and the line that failed — read them before changing anything. Rewriting or guessing at settings without the error is working blind.',
            level: 'applied',
          },
          {
            id: 'aws-course-3-cp-2',
            courseSlug: 'aws-course-3',
            programSlug: 'aws-cloud-technology-amazon',
            demonstratedSkill: 'Keep secrets out of code',
            onetSkills: ['Programming', 'Technology Design'],
            scenario:
              'Reviewing a teammate’s Python script, you see the AWS access key and secret typed directly into the code, which is about to be pushed to a shared repository.',
            question: 'What do you tell your teammate?',
            options: [
              {
                id: 'a',
                text: 'Remove the keys from the code and use IAM roles or environment variables instead',
              },
              { id: 'b', text: 'It is fine since only the team can see the repository' },
              { id: 'c', text: 'Just add a comment saying "do not share these keys"' },
              { id: 'd', text: 'Encrypt the file name so no one finds it' },
            ],
            correctOptionId: 'a',
            explanation:
              'Keys in code leak — repositories get cloned, shared, and breached, and leaked AWS keys are exploited within minutes. Roles and environment variables keep credentials out of the codebase entirely.',
            level: 'applied',
          },
        ],
      },
      {
        courseSlug: 'aws-course-4',
        courseName: 'Skills for Working as an AWS Cloud Consultant',
        programSlug: 'aws-cloud-technology-amazon',
        checkpoints: [
          {
            id: 'aws-course-4-cp-1',
            courseSlug: 'aws-course-4',
            programSlug: 'aws-cloud-technology-amazon',
            demonstratedSkill: 'Explain a technical recommendation to a non-technical client',
            onetSkills: ['Speaking', 'Social Perceptiveness'],
            scenario:
              'A small-business owner asks why you recommend moving her aging server to AWS. She is not technical and worries about cost.',
            question: 'Which explanation works best?',
            options: [
              {
                id: 'a',
                text: '"You’ll stop paying to maintain old hardware, pay only for what you use, and your data gets backed up automatically."',
              },
              {
                id: 'b',
                text: '"We’ll lift-and-shift your on-prem workload to EC2 with EBS-backed AMIs behind an ALB."',
              },
              { id: 'c', text: '"Trust me, cloud is just better."' },
              { id: 'd', text: '"Everyone else is doing it, so you should too."' },
            ],
            correctOptionId: 'a',
            explanation:
              'Clients decide based on benefits they understand — cost, safety, and less hassle. Jargon and "trust me" answers leave her worried and unconvinced.',
            level: 'applied',
          },
          {
            id: 'aws-course-4-cp-2',
            courseSlug: 'aws-course-4',
            programSlug: 'aws-cloud-technology-amazon',
            demonstratedSkill: 'Scope a client project honestly',
            onetSkills: ['Management of Material Resources', 'Social Perceptiveness'],
            scenario:
              'A client wants their whole company moved to AWS "by Friday." You estimate the work honestly takes about a month to do safely.',
            question: 'How do you respond?',
            options: [
              {
                id: 'a',
                text: 'Explain the realistic timeline and risks, and propose moving the most important system first',
              },
              { id: 'b', text: 'Agree to Friday and hope it works out' },
              { id: 'c', text: 'Refuse the project entirely' },
              { id: 'd', text: 'Agree to Friday but plan to quietly miss the deadline' },
            ],
            correctOptionId: 'a',
            explanation:
              'Honest scoping plus a phased plan gives the client real progress without a rushed, risky migration. Promising the impossible damages trust worse than a frank conversation.',
            level: 'applied',
          },
        ],
      },
      {
        courseSlug: 'aws-course-5',
        courseName: 'DevOps on AWS and Project Management',
        programSlug: 'aws-cloud-technology-amazon',
        checkpoints: [
          {
            id: 'aws-course-5-cp-1',
            courseSlug: 'aws-course-5',
            programSlug: 'aws-cloud-technology-amazon',
            demonstratedSkill: 'Respond to a failed deployment pipeline',
            onetSkills: ['Programming', 'Coordination'],
            scenario:
              'Your team’s CodePipeline deployment failed at the test stage, so the new version never reached production. A teammate suggests skipping the tests to "get it out."',
            question: 'What is the right call?',
            options: [
              {
                id: 'a',
                text: 'Keep the tests — fix what made them fail, then deploy through the pipeline',
              },
              { id: 'b', text: 'Skip the tests this once; they are probably wrong' },
              { id: 'c', text: 'Copy the files to production by hand to bypass the pipeline' },
              { id: 'd', text: 'Delete the pipeline and deploy manually from now on' },
            ],
            correctOptionId: 'a',
            explanation:
              'The pipeline blocked a release that failed its checks — that is it working, not failing. Skipping tests or hand-copying files ships the same broken code to customers.',
            level: 'job_ready',
          },
          {
            id: 'aws-course-5-cp-2',
            courseSlug: 'aws-course-5',
            programSlug: 'aws-cloud-technology-amazon',
            demonstratedSkill: 'Use infrastructure-as-code instead of manual setup',
            onetSkills: ['Programming', 'Management of Material Resources'],
            scenario:
              'Your team rebuilds the same AWS environment by hand for every new client, taking a full day each time, and small mistakes creep in.',
            question: 'What practice fixes this?',
            options: [
              {
                id: 'a',
                text: 'Define the environment in a CloudFormation template and deploy it from that',
              },
              { id: 'b', text: 'Write better sticky notes for the manual steps' },
              { id: 'c', text: 'Have two people do the manual setup to catch each other’s mistakes' },
              { id: 'd', text: 'Stop taking on new clients' },
            ],
            correctOptionId: 'a',
            explanation:
              'Infrastructure-as-code turns a day of error-prone clicking into a repeatable template that deploys identically every time. Better notes or extra reviewers still leave the process manual and slow.',
            level: 'job_ready',
          },
        ],
      },
      {
        courseSlug: 'aws-course-6',
        courseName: 'Automation in the AWS Cloud',
        programSlug: 'aws-cloud-technology-amazon',
        checkpoints: [
          {
            id: 'aws-course-6-cp-1',
            courseSlug: 'aws-course-6',
            programSlug: 'aws-cloud-technology-amazon',
            demonstratedSkill: 'Patch a fleet of servers without doing it by hand',
            onetSkills: ['Technology Design', 'Operations Analysis'],
            scenario:
              'Your company runs 40 EC2 instances that all need monthly security patches. Right now someone logs into each one and patches it by hand, which takes two days.',
            question: 'What do you set up instead?',
            options: [
              {
                id: 'a',
                text: 'AWS Systems Manager to apply patches across all instances on a schedule',
              },
              { id: 'b', text: 'A shared spreadsheet tracking who patched what' },
              { id: 'c', text: 'Skip patching — the servers are behind a firewall' },
              { id: 'd', text: 'Terminate all 40 instances so they need no patches' },
            ],
            correctOptionId: 'a',
            explanation:
              'Systems Manager patches whole fleets on a schedule and reports what succeeded — two days of manual work becomes a managed job. Skipping patches leaves known holes open behind the firewall.',
            level: 'job_ready',
          },
          {
            id: 'aws-course-6-cp-2',
            courseSlug: 'aws-course-6',
            programSlug: 'aws-cloud-technology-amazon',
            demonstratedSkill: 'Catch unsafe cloud settings automatically',
            onetSkills: ['Operations Analysis'],
            scenario:
              'Last month, someone accidentally made a company S3 bucket public, and no one noticed for weeks. Your manager wants this caught automatically next time.',
            question: 'What do you recommend?',
            options: [
              {
                id: 'a',
                text: 'AWS Config rules that flag public buckets and alert the team automatically',
              },
              { id: 'b', text: 'A reminder for someone to check all buckets by hand each quarter' },
              { id: 'c', text: 'Trusting that it will not happen again' },
              { id: 'd', text: 'Deleting all S3 buckets to be safe' },
            ],
            correctOptionId: 'a',
            explanation:
              'AWS Config continuously checks settings against rules and alerts the moment one drifts — minutes, not weeks. Quarterly manual checks leave the same long exposure window.',
            level: 'job_ready',
          },
        ],
      },
      {
        courseSlug: 'aws-course-7',
        courseName: 'Data Analytics and Databases on AWS',
        programSlug: 'aws-cloud-technology-amazon',
        checkpoints: [
          {
            id: 'aws-course-7-cp-1',
            courseSlug: 'aws-course-7',
            programSlug: 'aws-cloud-technology-amazon',
            demonstratedSkill: 'Choose the right AWS database for an application',
            onetSkills: ['Database Management', 'Systems Analysis'],
            scenario:
              'A developer asks you where to store the app’s customer orders. The data is structured (customers, orders, payments) and the team knows SQL well.',
            question: 'What do you suggest?',
            options: [
              { id: 'a', text: 'A relational database on Amazon RDS' },
              { id: 'b', text: 'Plain text files on the web server’s disk' },
              { id: 'c', text: 'A spreadsheet emailed around the team' },
              { id: 'd', text: 'No database — keep orders in the app’s memory' },
            ],
            correctOptionId: 'a',
            explanation:
              'Structured, related data queried with SQL is exactly what relational databases like RDS are built for, with backups managed for you. Files, spreadsheets, and memory lose data and break under load.',
            level: 'job_ready',
          },
          {
            id: 'aws-course-7-cp-2',
            courseSlug: 'aws-course-7',
            programSlug: 'aws-cloud-technology-amazon',
            demonstratedSkill: 'Query data in S3 without building servers',
            onetSkills: ['Database Management', 'Mathematics'],
            scenario:
              'Your company has months of sales logs sitting in S3. A manager wants a one-time report — total sales by region — without standing up any new servers.',
            question: 'What is the simplest AWS approach?',
            options: [
              { id: 'a', text: 'Use Athena to run SQL queries directly against the files in S3' },
              { id: 'b', text: 'Download every file and add the numbers in a calculator' },
              { id: 'c', text: 'Launch a large EC2 fleet to process the logs' },
              { id: 'd', text: 'Tell the manager the data cannot be queried' },
            ],
            correctOptionId: 'a',
            explanation:
              'Athena queries data right where it lives in S3 using SQL, with no servers to launch — ideal for one-time reports. Spinning up a fleet for a single question is slow and costly.',
            level: 'job_ready',
          },
        ],
      },
      {
        courseSlug: 'aws-course-8',
        courseName: 'Capstone: Following the AWS Well Architected Framework',
        programSlug: 'aws-cloud-technology-amazon',
        checkpoints: [
          {
            id: 'aws-course-8-cp-1',
            courseSlug: 'aws-course-8',
            programSlug: 'aws-cloud-technology-amazon',
            demonstratedSkill: 'Find the weakest point in a cloud design',
            onetSkills: ['Systems Evaluation', 'Complex Problem Solving'],
            scenario:
              'You review a client’s AWS setup: the app runs on a single EC2 instance in one availability zone, with no backups. The client says uptime is critical to their business.',
            question: 'What is the biggest problem you flag?',
            options: [
              {
                id: 'a',
                text: 'Everything depends on one instance — a single failure takes the whole business down',
              },
              { id: 'b', text: 'The instance name is not descriptive enough' },
              { id: 'c', text: 'They are using EC2 instead of a newer service' },
              { id: 'd', text: 'Nothing — one server is simpler, and simpler is always better' },
            ],
            correctOptionId: 'a',
            explanation:
              'A single instance with no backups is a single point of failure, which directly contradicts the client’s uptime goal. Reliability comes from redundancy across instances and zones.',
            level: 'job_ready',
          },
          {
            id: 'aws-course-8-cp-2',
            courseSlug: 'aws-course-8',
            programSlug: 'aws-cloud-technology-amazon',
            demonstratedSkill: 'Balance cost against reliability in a real design decision',
            onetSkills: ['Judgment and Decision Making', 'Systems Evaluation'],
            scenario:
              'A client’s budget is tight. Full multi-region redundancy would triple their AWS bill. Their app is important during business hours but tolerable to lose overnight.',
            question: 'What do you recommend?',
            options: [
              {
                id: 'a',
                text: 'Redundancy across two availability zones in one region, plus tested backups — matching cost to their actual risk',
              },
              { id: 'b', text: 'Full multi-region anyway — reliability is priceless' },
              { id: 'c', text: 'A single instance with no backups to save the most money' },
              { id: 'd', text: 'Tell them to leave AWS since they cannot afford it' },
            ],
            correctOptionId: 'a',
            explanation:
              'Good architecture matches spend to real business risk: multi-AZ plus backups covers their business-hours needs at a fraction of multi-region cost. Both extremes — gold-plating and no safety net — fail the client.',
            level: 'job_ready',
          },
        ],
      },
    ],
  },

  // ==========================================================================
  // IT Automation with Python (Google)
  // ==========================================================================
  {
    programSlug: 'it-automation-with-python-google',
    programTitle: 'IT Automation with Python',
    whyItMatters:
      'These checkpoints prove you can write and fix real Python automation — the skill employers test in interviews.',
    courses: [
      {
        courseSlug: 'it-auto-course-1',
        courseName: 'Crash Course on Python',
        programSlug: 'it-automation-with-python-google',
        checkpoints: [
          {
            id: 'it-auto-course-1-cp-1',
            courseSlug: 'it-auto-course-1',
            programSlug: 'it-automation-with-python-google',
            demonstratedSkill: 'Read a Python error message and fix the bug',
            onetSkills: ['Programming', 'Critical Thinking'],
            scenario:
              'Your script crashes with: TypeError: can only concatenate str (not "int") to str. The failing line is: print("Total tickets: " + count) where count is the number 5.',
            question: 'What is the fix?',
            options: [
              { id: 'a', text: 'Convert the number to text first: print("Total tickets: " + str(count))' },
              { id: 'b', text: 'Delete the print line so the error goes away' },
              { id: 'c', text: 'Rename the variable from count to total' },
              { id: 'd', text: 'Run the script again — errors sometimes pass' },
            ],
            correctOptionId: 'a',
            explanation:
              'Python cannot glue text and numbers together directly; str() converts the number to text first. The error message told you exactly that — reading it is the skill.',
            level: 'foundation',
          },
          {
            id: 'it-auto-course-1-cp-2',
            courseSlug: 'it-auto-course-1',
            programSlug: 'it-automation-with-python-google',
            demonstratedSkill: 'Use a loop instead of repeating code',
            onetSkills: ['Programming', 'Critical Thinking'],
            scenario:
              'A teammate’s script sends a welcome message to 50 new users by copy-pasting the same send line 50 times, changing only the name each time.',
            question: 'What is the better way?',
            options: [
              {
                id: 'a',
                text: 'Put the names in a list and use a for loop to send each message',
              },
              { id: 'b', text: 'Keep the 50 lines but add comments to each one' },
              { id: 'c', text: 'Split the 50 lines across five separate scripts' },
              { id: 'd', text: 'Type faster so the copy-pasting takes less time' },
            ],
            correctOptionId: 'a',
            explanation:
              'A loop over a list does the same work in three lines and handles 50 or 5,000 users without editing code. Copy-paste code means fixing every copy when something changes.',
            level: 'foundation',
          },
        ],
      },
      {
        courseSlug: 'it-auto-course-2',
        courseName: 'Using Python to Interact with the Operating System',
        programSlug: 'it-automation-with-python-google',
        checkpoints: [
          {
            id: 'it-auto-course-2-cp-1',
            courseSlug: 'it-auto-course-2',
            programSlug: 'it-automation-with-python-google',
            demonstratedSkill: 'Process files automatically with a script',
            onetSkills: ['Programming', 'Operations Analysis'],
            scenario:
              'Every morning, a folder fills with log files. Your boss wants any file containing the word "ERROR" copied into a review folder. Doing it by hand takes an hour.',
            question: 'How do you automate it?',
            options: [
              {
                id: 'a',
                text: 'Write a Python script that opens each file, checks for "ERROR", and copies the matches',
              },
              { id: 'b', text: 'Open each file by hand but use two monitors to go faster' },
              { id: 'c', text: 'Copy every file to the review folder so nothing is missed' },
              { id: 'd', text: 'Delete files that look unimportant from their names' },
            ],
            correctOptionId: 'a',
            explanation:
              'Reading files and matching text is a few lines of Python, and the script does the hour of work in seconds every day. Copying everything just moves the manual sorting downstream.',
            level: 'applied',
          },
          {
            id: 'it-auto-course-2-cp-2',
            courseSlug: 'it-auto-course-2',
            programSlug: 'it-automation-with-python-google',
            demonstratedSkill: 'Make a script handle bad input without crashing',
            onetSkills: ['Programming', 'Systems Analysis'],
            scenario:
              'Your file-processing script crashed overnight because one file in the folder was corrupted and unreadable. The 200 files after it never got processed.',
            question: 'How do you make the script more reliable?',
            options: [
              {
                id: 'a',
                text: 'Catch the error for that file, log it, skip it, and continue with the rest',
              },
              { id: 'b', text: 'Tell users to never put corrupted files in the folder' },
              { id: 'c', text: 'Run the script three times so it eventually gets through' },
              { id: 'd', text: 'Remove all error messages so the script cannot crash' },
            ],
            correctOptionId: 'a',
            explanation:
              'Error handling (try/except) lets one bad file be logged and skipped instead of killing the whole job. You cannot control input quality, but you can control how your script reacts.',
            level: 'applied',
          },
        ],
      },
      {
        courseSlug: 'it-auto-course-3',
        courseName: 'Introduction to Git and GitHub',
        programSlug: 'it-automation-with-python-google',
        checkpoints: [
          {
            id: 'it-auto-course-3-cp-1',
            courseSlug: 'it-auto-course-3',
            programSlug: 'it-automation-with-python-google',
            demonstratedSkill: 'Recover from a code change that broke things',
            onetSkills: ['Programming', 'Management of Material Resources'],
            scenario:
              'You changed a working script yesterday and committed it to Git. Today you discover the change broke an important feature, and you cannot remember everything you edited.',
            question: 'What does Git let you do?',
            options: [
              {
                id: 'a',
                text: 'Compare against or revert to yesterday’s working version from history',
              },
              { id: 'b', text: 'Nothing — the old version is gone once you commit' },
              { id: 'c', text: 'Email yourself the file every day as the real backup' },
              { id: 'd', text: 'Retype the script from memory' },
            ],
            correctOptionId: 'a',
            explanation:
              'Every commit is a saved snapshot — you can diff against it to see what changed or revert to it outright. This safety net is the main reason teams use version control.',
            level: 'applied',
          },
          {
            id: 'it-auto-course-3-cp-2',
            courseSlug: 'it-auto-course-3',
            programSlug: 'it-automation-with-python-google',
            demonstratedSkill: 'Share code changes with a team the right way',
            onetSkills: ['Programming', 'Management of Material Resources'],
            scenario:
              'You fixed a bug in a script your whole team uses from a shared GitHub repository. Your fix works on your machine. The team’s rule is that changes get reviewed.',
            question: 'How do you share the fix?',
            options: [
              {
                id: 'a',
                text: 'Push a branch and open a pull request so a teammate reviews it before merge',
              },
              { id: 'b', text: 'Email the edited file to everyone to copy over their version' },
              { id: 'c', text: 'Push straight to the main branch — your fix works, so review is a waste' },
              { id: 'd', text: 'Keep the fix on your machine only' },
            ],
            correctOptionId: 'a',
            explanation:
              'A pull request shares the change, invites review, and keeps one clean history for the team. Emailing files creates conflicting copies, and skipping agreed review breaks team trust.',
            level: 'applied',
          },
        ],
      },
      {
        courseSlug: 'it-auto-course-4',
        courseName: 'Troubleshooting and Debugging Techniques',
        programSlug: 'it-automation-with-python-google',
        checkpoints: [
          {
            id: 'it-auto-course-4-cp-1',
            courseSlug: 'it-auto-course-4',
            programSlug: 'it-automation-with-python-google',
            demonstratedSkill: 'Narrow down an intermittent bug systematically',
            onetSkills: ['Troubleshooting', 'Quality Control Analysis'],
            scenario:
              'A report script fails some mornings but not others. You notice it failed on the 1st and the 31st — both days when the input file was unusually large.',
            question: 'What do you do with this pattern?',
            options: [
              {
                id: 'a',
                text: 'Test the script with a large input file to try to reproduce the failure',
              },
              { id: 'b', text: 'Ignore the pattern — failures are random' },
              { id: 'c', text: 'Delete the large input files so the script never sees them' },
              { id: 'd', text: 'Schedule the script to skip the 1st and 31st' },
            ],
            correctOptionId: 'a',
            explanation:
              'Reproducing a bug on demand is the key step — once you can trigger it with a big file, you can find and fix the real cause. Avoiding the trigger just hides the bug.',
            level: 'job_ready',
          },
          {
            id: 'it-auto-course-4-cp-2',
            courseSlug: 'it-auto-course-4',
            programSlug: 'it-automation-with-python-google',
            demonstratedSkill: 'Use logs to find where a script goes wrong',
            onetSkills: ['Troubleshooting', 'Operations Analysis'],
            scenario:
              'A long automation script produces a wrong final number, but it does not crash, so there is no error message. You need to find which step goes wrong.',
            question: 'What is a solid approach?',
            options: [
              {
                id: 'a',
                text: 'Add logging of the key values at each step, run it, and find where the numbers stop making sense',
              },
              { id: 'b', text: 'Re-read the code top to bottom until the bug jumps out' },
              { id: 'c', text: 'Assume the input data is wrong and change it' },
              { id: 'd', text: 'Rewrite the script in a different language' },
            ],
            correctOptionId: 'a',
            explanation:
              'Logging intermediate values shows you exactly where correct data turns wrong — evidence instead of staring. Re-reading code misses logic bugs your eyes already accepted once.',
            level: 'job_ready',
          },
        ],
      },
      {
        courseSlug: 'it-auto-course-5',
        courseName: 'Configuration Management and the Cloud',
        programSlug: 'it-automation-with-python-google',
        checkpoints: [
          {
            id: 'it-auto-course-5-cp-1',
            courseSlug: 'it-auto-course-5',
            programSlug: 'it-automation-with-python-google',
            demonstratedSkill: 'Keep many machines configured the same way',
            onetSkills: ['Technology Design', 'Systems Analysis'],
            scenario:
              'Your company has 60 laptops that should all have the same security settings. Right now, technicians set each one up by hand, and audits keep finding machines configured differently.',
            question: 'What solves this for good?',
            options: [
              {
                id: 'a',
                text: 'Configuration management tooling that defines the settings once and enforces them on every machine',
              },
              { id: 'b', text: 'A longer printed checklist for the technicians' },
              { id: 'c', text: 'Auditing more often to catch the differences sooner' },
              { id: 'd', text: 'Letting each user pick their own security settings' },
            ],
            correctOptionId: 'a',
            explanation:
              'Configuration management (like Puppet) declares the desired state once and keeps every machine matching it automatically — drift gets corrected, not just discovered. Checklists and audits still depend on humans being perfect.',
            level: 'job_ready',
          },
          {
            id: 'it-auto-course-5-cp-2',
            courseSlug: 'it-auto-course-5',
            programSlug: 'it-automation-with-python-google',
            demonstratedSkill: 'Roll out a config change without breaking every machine at once',
            onetSkills: ['Management of Material Resources', 'Systems Analysis'],
            scenario:
              'You manage 200 cloud servers with a configuration tool. You need to push a change to a critical setting, and a mistake would take the service down.',
            question: 'How do you roll it out?',
            options: [
              {
                id: 'a',
                text: 'Apply it to a small test batch first, verify, then roll out in stages',
              },
              { id: 'b', text: 'Push to all 200 servers at once to get it over with' },
              { id: 'c', text: 'Change each server by hand to be extra careful' },
              { id: 'd', text: 'Skip the change — critical settings should never change' },
            ],
            correctOptionId: 'a',
            explanation:
              'Staged rollouts mean a bad change hurts a few test servers, not all 200 — you verify, then expand. Hand-editing 200 machines reintroduces the very inconsistency the tool exists to prevent.',
            level: 'job_ready',
          },
        ],
      },
      {
        courseSlug: 'it-auto-course-6',
        courseName: 'Automating Real-World Tasks with Python',
        programSlug: 'it-automation-with-python-google',
        checkpoints: [
          {
            id: 'it-auto-course-6-cp-1',
            courseSlug: 'it-auto-course-6',
            programSlug: 'it-automation-with-python-google',
            demonstratedSkill: 'Connect to a web service (API) from a script',
            onetSkills: ['Programming', 'Technology Design'],
            scenario:
              'Your script uploads daily reports to a company web service. Today every upload fails, and the service’s response includes status code 401 ("unauthorized").',
            question: 'What does that point to?',
            options: [
              {
                id: 'a',
                text: 'The script’s credentials or API key are wrong, expired, or missing',
              },
              { id: 'b', text: 'The internet is down' },
              { id: 'c', text: 'The reports are too big to upload' },
              { id: 'd', text: 'Python cannot talk to web services' },
            ],
            correctOptionId: 'a',
            explanation:
              '401 means the service got the request but rejected the credentials — so check the API key or token first. If the internet were down, you would get no response at all.',
            level: 'job_ready',
          },
          {
            id: 'it-auto-course-6-cp-2',
            courseSlug: 'it-auto-course-6',
            programSlug: 'it-automation-with-python-google',
            demonstratedSkill: 'Design an end-to-end automation responsibly',
            onetSkills: ['Programming', 'Operations Analysis'],
            scenario:
              'You wrote a script that processes customer images, updates a database, and emails a summary. It will run unattended every night. Tonight is its first real run.',
            question: 'What should the script do when something fails at 2 a.m.?',
            options: [
              {
                id: 'a',
                text: 'Log the failure clearly and alert the team, so the problem is visible by morning',
              },
              { id: 'b', text: 'Fail silently — alerts would wake people up' },
              { id: 'c', text: 'Retry forever until it works, no matter what' },
              { id: 'd', text: 'Email the customers to tell them the script broke' },
            ],
            correctOptionId: 'a',
            explanation:
              'Unattended automation must announce its failures — clear logs plus an alert turn a 2 a.m. problem into a quick morning fix. Silent failures get discovered by angry customers instead.',
            level: 'job_ready',
          },
        ],
      },
    ],
  },
];
