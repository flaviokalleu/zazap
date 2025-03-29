import React, { useEffect, useState, useContext } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels'; // Adicionado o plugin para datalabels
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import brLocale from 'date-fns/locale/pt-BR';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { Button, Grid, TextField } from '@material-ui/core';
import Typography from "@material-ui/core/Typography";
import api from '../../services/api';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import './button.css';
import { i18n } from '../../translate/i18n';
import { AuthContext } from "../../context/Auth/AuthContext";
import { useTheme } from '@material-ui/core';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ChartDataLabels // Registrando o plugin
);

// Função para criar gradiente futurista
const createGradient = (ctx, chartArea) => {
    const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
    gradient.addColorStop(0, '#00d4ff'); // Ciano claro
    gradient.addColorStop(0.5, '#3b82f6'); // Azul vibrante
    gradient.addColorStop(1, '#1e3a8a'); // Azul escuro
    return gradient;
};

export const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
        duration: 1000,
        easing: 'easeOutBounce', // Animação futurista
    },
    plugins: {
        legend: {
            display: false,
        },
        title: {
            display: true,
            text: 'Tickets',
            position: 'top',
            color: '#e0e0e0', // Cor clara para um look futurista
            font: {
                size: 18,
                weight: 'bold',
                family: "'Orbitron', sans-serif", // Fonte futurista
            },
        },
        datalabels: {
            display: true,
            anchor: 'end',
            align: 'top',
            color: '#ffffff',
            textStrokeColor: '#000000',
            textStrokeWidth: 2,
            font: {
                size: 16,
                weight: 'bold',
                family: "'Roboto Mono', monospace", // Fonte tecnológica
            },
            formatter: (value) => value > 0 ? value : '', // Mostra apenas valores positivos
        },
        tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleFont: { family: "'Roboto Mono', monospace" },
            bodyFont: { family: "'Roboto Mono', monospace" },
            cornerRadius: 8,
            borderColor: '#00d4ff',
            borderWidth: 1,
        },
    },
    scales: {
        x: {
            grid: {
                display: false, // Remove gridlines para um look mais limpo
            },
            ticks: {
                color: '#b0b0b0',
                font: {
                    family: "'Roboto Mono', monospace",
                },
            },
        },
        y: {
            grid: {
                color: 'rgba(255, 255, 255, 0.1)',
                borderDash: [5, 5], // Linhas tracejadas para um toque futurista
            },
            ticks: {
                color: '#b0b0b0',
                font: {
                    family: "'Roboto Mono', monospace",
                },
            },
        },
    },
    elements: {
        bar: {
            borderRadius: 4, // Bordas arredondadas nas barras
            borderWidth: 1,
            borderColor: '#00d4ff', // Borda ciano para destacar
        },
    },
};

export const ChartsDate = () => {
    const theme = useTheme();
    const [initialDate, setInitialDate] = useState(new Date());
    const [finalDate, setFinalDate] = useState(new Date());
    const [ticketsData, setTicketsData] = useState({ data: [], count: 0 });
    const { user } = useContext(AuthContext);

    const companyId = user.companyId;

    useEffect(() => {
        if (companyId) {
            handleGetTicketsInformation();
        }
    }, [companyId]);

    const dataCharts = {
        labels: ticketsData?.data.length > 0 ? ticketsData.data.map((item) => 
            (item.hasOwnProperty('horario') ? `Das ${item.horario}:00 às ${item.horario}:59` : item.data)
        ) : [],
        datasets: [
            {
                data: ticketsData?.data.length > 0 ? ticketsData.data.map((item) => item.total) : [],
                backgroundColor: (context) => {
                    const chart = context.chart;
                    const { ctx, chartArea } = chart;
                    if (!chartArea) return null;
                    return createGradient(ctx, chartArea);
                },
                borderSkipped: false,
                hoverBackgroundColor: '#60a5fa', // Efeito ao passar o mouse
                barThickness: 30, // Barras mais finas e modernas
            },
        ],
    };

    const handleGetTicketsInformation = async () => {
        try {
            const { data } = await api.get(`/dashboard/ticketsDay?initialDate=${format(initialDate, 'yyyy-MM-dd')}&finalDate=${format(finalDate, 'yyyy-MM-dd')}&companyId=${companyId}`);
            setTicketsData(data);
        } catch (error) {
            toast.error('Erro ao buscar informações dos tickets');
        }
    };

    return (
        <>
            <Typography component="h2" variant="h6" color="primary" gutterBottom>
                {i18n.t("dashboard.users.totalAttendances")} ({ticketsData?.count})
            </Typography>

            <Grid container spacing={2}>
                <Grid item>
                    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={brLocale}>
                        <DatePicker
                            value={initialDate}
                            onChange={(newValue) => { setInitialDate(newValue) }}
                            label={i18n.t("dashboard.date.initialDate")}
                            renderInput={(params) => <TextField fullWidth {...params} sx={{ width: '20ch' }} />}
                        />
                    </LocalizationProvider>
                </Grid>
                <Grid item>
                    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={brLocale}>
                        <DatePicker
                            value={finalDate}
                            onChange={(newValue) => { setFinalDate(newValue) }}
                            label={i18n.t("dashboard.date.finalDate")}
                            renderInput={(params) => <TextField fullWidth {...params} sx={{ width: '20ch' }} />}
                        />
                    </LocalizationProvider>
                </Grid>
                <Grid item>
                    <Button 
                        style={{ backgroundColor: theme.palette.primary.main, top: '10px' }} 
                        onClick={handleGetTicketsInformation} 
                        variant='contained'
                    >
                        Filtrar
                    </Button>
                </Grid>
            </Grid>
            <div style={{ position: 'relative', height: '300px', width: '100%' }}>
                <Bar options={options} data={dataCharts} />
            </div>
        </>
    );
};