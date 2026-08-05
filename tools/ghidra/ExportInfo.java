import ghidra.app.script.GhidraScript;
import ghidra.app.decompiler.*;
import ghidra.program.model.address.*;
import ghidra.program.model.listing.*;
import ghidra.program.model.symbol.*;
import java.io.*;
import java.util.*;

public class ExportInfo extends GhidraScript {
    public void run() throws Exception {
        String dir = getScriptArgs()[0];
        AddressSpace sp = currentProgram.getAddressFactory().getDefaultAddressSpace();
        // seed disassembly + functions
        int made = 0, dis = 0;
        for (String fn : new String[]{"seed_code.txt","seed_funcs.txt"}) {
            boolean asFunc = fn.contains("funcs");
            BufferedReader r = new BufferedReader(new FileReader(dir + "/" + fn));
            String line;
            while ((line = r.readLine()) != null) {
                if (line.trim().isEmpty()) continue;
                Address a = sp.getAddress(Long.parseLong(line.trim().substring(2), 16));
                if (getInstructionAt(a) == null) { if (disassemble(a)) dis++; }
                if (asFunc && getFunctionAt(a) == null) {
                    if (createFunction(a, null) != null) made++;
                }
            }
            r.close();
        }
        println("seeded: disassembled " + dis + " points, created " + made + " functions");
        analyzeAll(currentProgram);

        // coverage
        long insBytes = 0; int insCount = 0;
        InstructionIterator it = currentProgram.getListing().getInstructions(true);
        while (it.hasNext()) { Instruction i = it.next(); insCount++; insBytes += i.getLength(); }
        long total = currentProgram.getMemory().getSize();
        println("instructions: " + insCount + " covering " + insBytes + " of " + total
                + " bytes (" + (100 * insBytes / total) + "%)");

        // function list sorted by inbound call count
        FunctionIterator fit = currentProgram.getFunctionManager().getFunctions(true);
        List<Function> fs = new ArrayList<>();
        while (fit.hasNext()) fs.add(fit.next());
        println("functions: " + fs.size());
        PrintWriter out = new PrintWriter(dir + "/ghidra_functions.txt");
        List<String> rows = new ArrayList<>();
        for (Function f : fs) {
            int xr = getReferencesTo(f.getEntryPoint()).length;
            rows.add(String.format("%6d  %s  size=%d", xr, f.getEntryPoint(), f.getBody().getNumAddresses()));
        }
        Collections.sort(rows, Collections.reverseOrder());
        for (String s : rows) out.println(s);
        out.close();
        println("--- top 25 most-called functions (xrefs, addr, size) ---");
        for (int i = 0; i < Math.min(25, rows.size()); i++) println(rows.get(i));
    }
}
