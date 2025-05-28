if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}

const app = Vue.createApp({
  data() {
    return {
      obras: [],
      form: this.getEmptyForm(),
      external: false,
      searchQuery: "",
      searchDateStart: "",
      searchDateEnd: "",
      csvFiles: [],
      uploadReplace: false,
      editIndex: null,
      modalInstance: null,
      deleteIndex: null,
      confirmDeleteModal: null,
      categorias: ["Móveis/Eletro", "Construção", "Tecnologia", "Outros"],
    };
  },
  mounted() {
    const param = new URLSearchParams(window.location.search).get("data");
    if (param) {
      try {
        const decompressed = LZString.decompressFromEncodedURIComponent(param);
        this.obras = decompressed.split(";").map(line => {
            const [
                d,
                cn,
                ct,
                e,
                c,
                o,
            ] = line.split("|");
            return {
                data_registro: `20${d}`,
                cliente_nome: cn,
                cliente_telefone: ct,
                endereco: e,
                categoria: this.categorias.indexOf(c),
                observacao: o,
            };
        });
      } catch (e) {
        console.error("Erro ao importar dados da URL:", e);
      }
    } else {
      this.loadObras();
    }
    this.modalInstance = new bootstrap.Modal(document.getElementById("obraModal"));
    this.confirmDeleteModal = new bootstrap.Modal(document.getElementById("confirmDeleteModal"));
  },
  methods: {
    getEmptyForm() {
      return {
        data_registro: new Date().toISOString().split("T")[0],
        cliente_nome: "",
        cliente_telefone: "",
        endereco: "",
        categoria: "",
        observacao: "",
      };
    },
    openModal(index = null) {
      if (index !== null) {
        this.editIndex = index;
        this.form = { ...this.obras[index] };
      } else {
        this.editIndex = null;
        this.form = this.getEmptyForm();
      }
      this.modalInstance.show();
    },
    saveObra() {
      if (this.editIndex !== null) {
        this.obras[this.editIndex] = { ...this.form };
      } else {
        this.obras.push({ ...this.form });
      }
      this.saveToStorage();
      this.modalInstance.hide();
    },
    confirmDelete(index) {
      this.deleteIndex = index;
      this.confirmDeleteModal.show();
    },
    deleteObra() {
      if (this.deleteIndex !== null) {
        this.obras.splice(this.deleteIndex, 1);
        this.saveToStorage();
        this.deleteIndex = null;
      }
      this.confirmDeleteModal.hide();
    },
    loadObras() {
      try{
        const data = localStorage.getItem("obras");
        if (data) {
          data_obras = JSON.parse(data);
          this.obras = data_obras.map((o) => {
            const base_obra = this.getEmptyForm();
            base_obra.data_registro = o['data_registro']
            base_obra.cliente_nome = o['cliente_nome']
            base_obra.cliente_telefone = o['cliente_telefone']
            base_obra.endereco = o['endereco']
            base_obra.categoria = o['categoria']
            base_obra.observacao = o['observacao']
            return base_obra
          })
        }
      } catch(e) {
        console.log(e);
      }
    },
    saveToStorage() {
      if (!this.external) {
        localStorage.setItem("obras", JSON.stringify(this.obras));
      }
    },
    exportCSV() {
      if (!this.obras.length) return;

      const header = Object.keys(this.obras[0]).join(",");
      const rows = this.obras.map((obj) =>
        Object.values(obj)
          .map((val) => `"${String(val).replace(/"/g, '""')}"`)
          .join(",")
      );

      const csvContent = [header, ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", "obras.csv");
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    handleFileUpload(event) {
      this.csvFiles = [...event.target.files];
      console.log(this.csvFiles);
    },
    importCSV() {
      if (!this.csvFiles) return;
      if (this.uploadReplace) this.obras = [];
      this.csvFiles.forEach((csvFile) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target.result;
          const [headerLine, ...lines] = text.trim().split("\n");
          const headers = headerLine.split(",").map((h) => h.trim());

          const newObras = lines.map((line) => {
            const values = line.split(",").map((v) => v.replace(/^"|"$/g, "").trim());
            const obra = {};
            headers.forEach((h, i) => (obra[h] = values[i]));
            return obra;
          });

          this.obras.push(...newObras);
          this.saveToStorage();
        };
        reader.readAsText(csvFile);
      });
      this.csvFiles = [];
      this.uploadReplace = false;
    },
    generateShareUrl() {
        const compactObras = this.obras.map(o => [
            o.data_registro.replace(/^20/, ''),
            o.cliente_nome,
            o.cliente_telefone,
            o.endereco,
            this.categorias.indexOf(o.categoria),
            o.observacao,
        ].join("|")).join(";");
        const compressed = LZString.compressToEncodedURIComponent(compactObras);
        const url = `${window.location.origin}${window.location.pathname}?data=${compressed}`;
        navigator.clipboard.writeText(url).then(() => {
            alert("Link copiado para a área de transferência!");
        });
    },
  },
  computed: {
    filteredObras() {
      const dateStart = this.searchDateStart;
      const dateEnd = this.searchDateEnd;
      const query = this.searchQuery.toLowerCase();
      return this.obras.filter((obra) => {
        const obraDate = new Date(obra.data_registro);
        const validDateStart = !dateStart || new Date(dateStart) <= obraDate;
        const validDateEnd = !dateEnd || new Date(dateEnd) >= obraDate;
        const validQuery = Object.values(obra).some((val) => String(val).toLowerCase().includes(query));
        return validDateStart && validDateEnd && validQuery;
      });
    },
  },
});

app.mount("#app");
