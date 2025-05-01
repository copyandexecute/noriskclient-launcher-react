<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { invoke } from '@tauri-apps/api/core'; // Import invoke
	import { writeText } from '@tauri-apps/plugin-clipboard-manager'; // Import for clipboard

	// Define props using runes
	let { 
		isOpen = false, 
		profileName = null,
		exitCode = null,
		processId = null,
		profileId = null
	} = $props<{ 
		isOpen?: boolean; 
		profileName?: string | null;
		exitCode?: string | null;
		processId?: string | null;
		profileId?: string | null;
	}>();

	// State for mclo.gs upload
	let isUploading = $state(false);
	let uploadErrorMsg = $state<string | null>(null);
	let mclogsUrl = $state<string | null>(null);
	let copied = $state(false);

	const dispatch = createEventDispatcher();

	const close = () => {
		// Reset upload state when closing
		isUploading = false;
		uploadErrorMsg = null;
		mclogsUrl = null;
		copied = false;
		isOpen = false; // Intern schließen (optional, je nach State-Management)
		dispatch('close'); // Event senden, damit der Parent den State ändern kann
	};

	// Klick auf Overlay schließt das Popup
	const handleOverlayClick = () => {
		close();
	};

	// Klick in Content-Box verhindert Schließen
	const handleContentClick = (event: MouseEvent) => {
		event.stopPropagation();
	};

	// Hilfsfunktion für Exit-Code-Beschreibung (wie in React-Beispiel)
	const getExitCodeDescription = (code: string | null): string => {
		if (!code) return 'Unbekannter Fehler';
		// Extrahiere den reinen Code-String
		const match = code.match(/-?\d+/);
		const numericCode = match ? parseInt(match[0], 10) : NaN;

		const hexCode = !isNaN(numericCode)
			? `0x${(numericCode >>> 0).toString(16).toUpperCase()}`
			: 'N/A';
		const displayCode = `${numericCode} (${hexCode})`;

		switch (numericCode) {
			case -1073741819: // 0xC0000005
				return `Zugriffsverletzung (${displayCode})`;
			case -1073741571: // 0xC00000FD
				return `Stacküberlauf (${displayCode})`;
			case -1073740791: // 0xC0000409
				return `Stack-Pufferüberlauf (${displayCode})`;
			case -1073741515: // 0xC0000135
				return `.NET Framework Initialisierungsfehler (${displayCode})`;
			case 1:
				return `Allgemeiner Fehler (${displayCode})`;
			default:
				return `Code: ${displayCode}`;
		}
	};

	//$: sorgt dafür, dass description neu berechnet wird, wenn exitCode sich ändert
	const description = $derived(getExitCodeDescription(exitCode));

	// Funktion für den optionalen "Logs anzeigen"-Button
	const showLogs = async () => { // Make async
		if (!profileId) {
			console.error('Profile ID not available to show logs.');
			close();
			return;
		}
		console.log('Requesting to open latest log for profile:', profileId);
		try {
			await invoke('open_profile_latest_log', { profileId: profileId });
			console.log('Backend command open_profile_latest_log invoked successfully.');
		} catch (error) {
			console.error('Error invoking open_profile_latest_log:', error);
			// Optionally show another error message to the user
		}
	};

	// Funktion zum Hochladen der Logs
	const uploadLogs = async () => {
		if (!profileId) {
			console.error('Profile ID not available to upload logs.');
			uploadErrorMsg = "Profil-ID fehlt, Logs können nicht abgerufen werden.";
			return;
		}

		isUploading = true;
		uploadErrorMsg = null;
		mclogsUrl = null;
		copied = false;
		console.log(`Starting log upload for profile ${profileId}...`);

		try {
			// 1. Get the latest log content using the profileId
			console.log(`Fetching latest log for profile ${profileId}...`);
			const logContent: string = await invoke("get_profile_latest_log_content", { profileId });
			console.log(`Log content fetched successfully (${logContent.length} characters).`);

			if (!logContent.trim()) {
				console.warn("Log content is empty, aborting upload.");
				uploadErrorMsg = "Die Log-Datei ist leer.";
				isUploading = false;
				return;
			}

			// 2. Upload the content
			console.log("Uploading log content to mclo.gs...");
			const url: string = await invoke("upload_log_to_mclogs_command", { logContent });
			console.log("Log uploaded successfully. URL:", url);

			mclogsUrl = url;

			// 3. Copy URL to clipboard
			await writeText(url);
			console.log("Copied mclo.gs URL to clipboard.");
			copied = true; // Indicate successful copy
			// Optional: Reset copied state after a few seconds
			setTimeout(() => { copied = false; }, 2500);

		} catch (e) {
			console.error(`Error during log upload for profile ${profileId}:`, e);
			uploadErrorMsg = e instanceof Error ? `Fehler: ${e}` : `Fehler: ${e.message}`;
		} finally {
			isUploading = false;
			console.log(`Log upload process finished for profile ${profileId}.`);
		}
	};
</script>

{#if isOpen}
	<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
	<div class="error-popup-overlay" on:click={handleOverlayClick}>
		<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
		<div class="error-popup-content" on:click={handleContentClick}>
			<h2>Minecraft ist abgestürzt!</h2>
			<p>
				Der Start des Profils "{profileName || 'Unbekanntes Profil'}" ist fehlgeschlagen.
			</p>

			<div class="error-details">
				<strong>Grund:</strong>
				{description}
			</div>

			<!-- Buttons -->
			<div class="button-container">
				<button on:click={close}> Okay </button>
				{#if processId}
					<!-- Logs anzeigen Button -->
					<button class="secondary-button" on:click={showLogs}> Logs anzeigen </button>
					<!-- Logs hochladen Button -->
					<button class="secondary-button upload-button" on:click={uploadLogs} disabled={isUploading}>
						{#if isUploading}
							Wird hochgeladen...
						{:else if copied}
							URL kopiert!
						{:else}
							Logs hochladen
						{/if}
					</button>
				{/if}
			</div>

			<!-- Upload Status/Result -->
			{#if isUploading || uploadErrorMsg || mclogsUrl}
				<div class="upload-status">
					{#if uploadErrorMsg}
						<p class="upload-error">{uploadErrorMsg}</p>
					{/if}
					{#if mclogsUrl}
						<p class="upload-success">
							Logs hochgeladen: <a href={mclogsUrl} target="_blank" rel="noopener noreferrer">{mclogsUrl}</a>
							{#if copied}(URL kopiert!){/if}
						</p>
					{/if}
				</div>
			{/if}

		</div>
	</div>
{/if}

<style>
	/* CSS bleibt größtenteils gleich wie im vorherigen Beispiel */
	.error-popup-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(0, 0, 0, 0.6);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 1000;
		font-family: sans-serif;
	}

	.error-popup-content {
		background-color: #fff;
		padding: 30px;
		border-radius: 8px;
		box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
		max-width: 450px;
		width: 90%;
		text-align: center;
		border-left: 5px solid #e74c3c;
	}

	.error-popup-content h2 {
		color: #e74c3c;
		margin-top: 0;
		margin-bottom: 15px;
		font-size: 1.4em;
	}

	.error-popup-content p {
		margin-bottom: 10px;
		line-height: 1.5;
		color: #333;
	}

	.error-popup-content .error-details {
		background-color: #f8f8f8;
		border: 1px solid #eee;
		padding: 10px 15px;
		border-radius: 4px;
		font-family: monospace;
		color: #555;
		margin-top: 20px;
		margin-bottom: 25px;
		text-align: left;
		word-wrap: break-word;
	}

	.button-container {
		display: flex;
		justify-content: center;
		gap: 10px; /* Abstand zwischen den Buttons */
		margin-bottom: 15px; /* Abstand nach unten */
	}

	.error-popup-content button {
		background-color: #3498db;
		color: white;
		border: none;
		padding: 12px 20px; /* Etwas weniger Padding */
		border-radius: 5px;
		cursor: pointer;
		font-size: 15px; /* Etwas kleiner */
		transition: background-color 0.2s ease, opacity 0.2s ease;
	}

	.error-popup-content button:hover:not(:disabled) {
		background-color: #2980b9;
	}

	.error-popup-content button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	/* Styling für sekundären Button (Logs) */
	.error-popup-content button.secondary-button {
		/* margin-left: 10px; Removed, using gap now */
		background-color: #7f8c8d; /* Grau */
	}
	.error-popup-content button.secondary-button:hover:not(:disabled) {
		background-color: #6c7a7d;
	}

	/* Styling for Upload Button when successful copy */
	.error-popup-content button.upload-button:disabled {
		background-color: #2ecc71; /* Green */
		opacity: 1;
		cursor: default;
	}

	/* Upload Status Area */
	.upload-status {
		margin-top: 15px;
		padding-top: 15px;
		border-top: 1px solid #eee;
		font-size: 0.9em;
		text-align: left;
	}
	.upload-error {
		color: #e74c3c;
		font-weight: bold;
	}
	.upload-success {
		color: #27ae60;
	}
	.upload-success a {
		color: #2980b9;
		text-decoration: none;
		word-break: break-all; /* Allow long URLs to wrap */
	}
	.upload-success a:hover {
		text-decoration: underline;
	}
</style> 