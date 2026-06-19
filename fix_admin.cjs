const fs = require('fs');
const file = 'c:/Users/sriram/OneDrive/Desktop/wings_intern/wings/src/pages/Admin/AdminHubs.tsx';
let content = fs.readFileSync(file, 'utf8');

// The file got mangled. The corrupted part looks like:
//         results = results.filter((p: any) =>
//           p.full_name?.toLowerCase().includes(s) ||
//           p.phone?.includes(s) ||
//     mutationFn: async (form: {

const startStr = "results = results.filter((p: any) =>";
const endStr = "    mutationFn: async (form: {";

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
  const replacement = `results = results.filter((p: any) =>
          p.full_name?.toLowerCase().includes(s) ||
          p.phone?.includes(s) ||
          p.assigned_state?.toLowerCase().includes(s)
        );
      }
      return results;
    },
  });
}

function useCreateHubPartnerAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (form: {`;

  content = content.substring(0, startIndex) + replacement + content.substring(endIndex + endStr.length);
  fs.writeFileSync(file, content);
  console.log("Fixed successfully.");
} else {
  console.log("Could not find the target indices.", startIndex, endIndex);
}
