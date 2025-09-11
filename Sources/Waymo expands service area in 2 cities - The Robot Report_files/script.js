
	<script>	
	document.addEventListener('DOMContentLoaded', function() {	
		const toggleAdButton = document.getElementById('toggleAdButton');	
		const enableCodeCheckbox = document.getElementById('dm_DTPROMOad_enable_code');	
		toggleAdButton.addEventListener('click', function() {	
			enableCodeCheckbox.checked = !enableCodeCheckbox.checked;	
		});	
		enableCodeCheckbox.addEventListener('change', function() {	
			toggleAdButton.textContent = this.checked ? 'Disable Ad' : 'Enable Ad';	
		});	
	});	
</script>


