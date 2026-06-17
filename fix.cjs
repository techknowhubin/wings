const fs = require('fs');
let c = fs.readFileSync('c:/Users/sriram/OneDrive/Desktop/wings_intern/wings/src/pages/Admin/AdminHubs.tsx', 'utf8');

// Fix the line that has // "?"?"? Hooks "?"?"?...function
c = c.replace(/\/\/.*Hooks.*function useHubPartnerProfiles/g, '// --- Hooks ---\n\nfunction useHubPartnerProfiles');

// Fix the trailing garbage after the end of useHubPartnerProfiles
const searchStr = `  });
}    p.phone?.includes(s) ||
          p.assigned_state?.toLowerCase().includes(s)
        );
      }
      return results;
    },
  });
}`;

c = c.replace(searchStr, `  });
}`);

fs.writeFileSync('c:/Users/sriram/OneDrive/Desktop/wings_intern/wings/src/pages/Admin/AdminHubs.tsx', c);
console.log('Fixed');
